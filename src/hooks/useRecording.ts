"use client";

import { useState, useRef, useEffect } from "react";

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    transcript: string;
    persistentTranscript: string;
    translatedTranscript: string;
    isInitializing: boolean;
    audioBlob: Blob | null;
    error: string | null;
}

export const useRecording = (lang: string = "en-US", isTTSEnabled: boolean = false) => {
    const [state, setState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        transcript: "",
        persistentTranscript: "",
        translatedTranscript: "",
        isInitializing: false,
        audioBlob: null,
        error: null,
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null); // Wake Lock Reference
    const isRecordingRef = useRef(false); // Critical for event handlers
    const isPausedRef = useRef(false); // Critical for event handlers
    const retryCountRef = useRef(0); // For exponential backoff
    const lastErrorRef = useRef<string | null>(null); // To track error context in onend
    const lastSpokenRef = useRef<string>(""); // To avoid repeating TTS

    // --- Wake Lock Management ---
    const requestWakeLock = async () => {
        try {
            if ("wakeLock" in navigator && !wakeLockRef.current) {
                wakeLockRef.current = await navigator.wakeLock.request("screen");
                console.log("Wake Lock active: Screen will not sleep.");
                wakeLockRef.current.addEventListener('release', () => {
                    console.log("Wake Lock released.");
                });
            }
        } catch (err: any) {
            console.warn(`Wake Lock Error: ${err.message}. System may sleep if left idle.`);
        }
    };

    const releaseWakeLock = () => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().then(() => {
                wakeLockRef.current = null;
            });
        }
    };

    // Re-request wake lock if tab becomes visible again while recording
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && state.isRecording && !state.isPaused) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [state.isRecording, state.isPaused]);
    // ----------------------------

    const teardown = () => {
        console.log("Tearing down hardware...");
        releaseWakeLock();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            console.log("Stopping MediaRecorder.");
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            console.log("Stopping SpeechRecognition.");
            recognitionRef.current.stop();
        }
        if (streamRef.current) {
            console.log("Stopping media stream tracks.");
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
        streamRef.current = null;
    };

    const initHardware = async () => {
        console.log("Initializing hardware (mic, speech recognition)...");
        setState(prev => ({ ...prev, isInitializing: true }));
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            console.log("Mic access granted.");

            // 1. MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            // audioChunksRef.current is managed by startRecording/resumeRecording

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
                setState((prev) => ({ ...prev, audioBlob }));
                // Stream tracks are stopped by teardown, not here
            };

            mediaRecorder.start(5000);
            console.log("MediaRecorder started.");

            // 2. SpeechRecognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                console.log("SpeechRecognition found. Initializing...");
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = lang;

                recognition.onstart = () => {
                    console.log("SpeechRecognition started.");
                    setState(prev => ({ ...prev, error: null, isInitializing: false }));
                    retryCountRef.current = 0; // Reset on success
                    lastErrorRef.current = null;
                };

                recognition.onerror = (event: any) => {
                    const isSilent = ["network", "aborted", "no-speech"].includes(event.error);

                    if (isSilent) {
                        console.warn("SpeechRecognition transient error:", event.error);
                    } else {
                        console.error("SpeechRecognition fatal error:", event.error);
                    }

                    lastErrorRef.current = event.error;

                    if (event.error === "network") {
                        setState(prev => ({ ...prev, error: "Connection unstable. Maintaining session..." }));
                    } else if (event.error === "aborted") {
                        // Silent in UI, let onend handle the restart
                        console.log("SpeechRecognition aborted. Waiting for onend to restart.");
                    } else if (event.error === "not-allowed") {
                        setState(prev => ({ ...prev, error: "Microphone blocked. Please check permissions." }));
                        stopRecording();
                    } else {
                        setState(prev => ({ ...prev, error: `Transcription Error: ${event.error}` }));
                    }
                };

                recognition.onresult = (event: any) => {
                    let finalTranscript = "";
                    let interimTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const segment = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            // Smart Autocorrect for Clinical Terms
                            let formatted = segment.trim()
                                .replace(/\blexapro\b/gi, "Lexapro")
                                .replace(/\bzoloft\b/gi, "Zoloft")
                                .replace(/\bxanax\b/gi, "Xanax")
                                .replace(/\bfentanyl\b/gi, "Fentanyl")
                                .replace(/\bativan\b/gi, "Ativan")
                                .replace(/\bsoap note\b/gi, "SOAP Note")
                                .replace(/\bmse\b/gi, "MSE")
                                .replace(/\bphi\b/gi, "PHI");

                            finalTranscript += (finalTranscript ? " " : "") + formatted;
                        } else {
                            interimTranscript += segment;
                        }
                    }

                    setState((prev) => {
                        const now = Date.now();
                        const lastResultTime = (window as any)._lastResultTime || now;
                        (window as any)._lastResultTime = now;

                        // Auto-Paragraphing on silence (> 2.5s)
                        const isNewParagraph = (now - lastResultTime) > 2500 && prev.persistentTranscript.length > 0;
                        const prefix = isNewParagraph ? "\n\n" : (prev.persistentTranscript.endsWith("\n") || prev.persistentTranscript.length === 0 ? "" : " ");

                        const newPersistent = prev.persistentTranscript + prefix + finalTranscript;

                        return {
                            ...prev,
                            transcript: newPersistent + interimTranscript,
                            persistentTranscript: newPersistent,
                            error: null
                        };
                    });
                };

                recognition.onend = () => {
                    console.log("SpeechRecognition session ended.");
                    if (isRecordingRef.current && !isPausedRef.current) {
                        // Limit total retries to prevent runaway loops
                        if (retryCountRef.current > 20) {
                            console.error("Max retries reached. Stopping recording.");
                            setState(prev => ({ ...prev, error: "System error: Persistent failure." }));
                            stopRecording();
                            return;
                        }

                        const isAborted = lastErrorRef.current === "aborted";
                        const isNetwork = lastErrorRef.current === "network";

                        // If network error persists, do a "Hard Reset" of the mic/stream
                        if (isNetwork && retryCountRef.current > 1) {
                            console.log("Persistent network issue detected (Edge-specific). Performing hard hardware reset...");
                            teardown();
                            setTimeout(() => {
                                if (isRecordingRef.current && !isPausedRef.current) initHardware();
                            }, 800);
                            return;
                        }

                        // Fast initial retry for aborted (500ms), then exponential
                        const backoff = isAborted && retryCountRef.current === 0
                            ? 500
                            : Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

                        console.log(`Recovery: Restarting in ${backoff}ms (Context: ${lastErrorRef.current || 'onend'}, Retry: ${retryCountRef.current})...`);

                        setTimeout(() => {
                            if (isRecordingRef.current && !isPausedRef.current) {
                                try {
                                    recognition.start();
                                    retryCountRef.current++;
                                } catch (err) {
                                    console.error("Critical failure starting recognition:", err);
                                }
                            }
                        }, backoff);
                    }
                };

                recognition.start();
                recognitionRef.current = recognition;
            } else {
                console.warn("SpeechRecognition not supported in this browser.");
                setState(prev => ({ ...prev, error: "Browser not supported. Please use Chrome or Edge." }));
            }

        } catch (err: any) {
            console.error("Critical recording error:", err);
            isRecordingRef.current = false;
            isPausedRef.current = false;
            setState(prev => ({ ...prev, error: err.message || "Failed to start", isInitializing: false }));
            teardown(); // Ensure all hardware is stopped on critical error
        }
    };

    const startRecording = async () => {
        console.log("Starting recording flow...");
        audioChunksRef.current = []; // Clear audio chunks for a new recording
        isRecordingRef.current = true;
        isPausedRef.current = false;

        setState((prev) => ({
            ...prev,
            isRecording: true,
            isPaused: false,
            duration: 0,
            transcript: "",
            persistentTranscript: "",
            translatedTranscript: "",
            isInitializing: true,
            audioBlob: null,
            error: null
        }));

        await initHardware();
        requestWakeLock(); // Request Wake Lock when starting

        timerRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    };

    const pauseRecording = () => {
        console.log("Pausing recording...");
        isPausedRef.current = true;
        teardown(); // Stop all hardware & release wake lock
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setState(prev => ({ ...prev, isPaused: true }));
    };

    const resumeRecording = async () => {
        console.log("Resuming recording...");
        isPausedRef.current = false;
        setState(prev => ({ ...prev, isPaused: false, error: null })); // Clear error on resume
        await initHardware(); // Re-initialize hardware
        requestWakeLock(); // Re-request Wake Lock on resume

        timerRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
    };

    const stopRecording = () => {
        console.log("Stopping recording...");
        isRecordingRef.current = false;
        isPausedRef.current = false; // Ensure paused state is cleared
        teardown(); // Stop all hardware
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setState((prev) => ({ ...prev, isRecording: false, isPaused: false }));
    };

    const clearTranscript = () => {
        console.log("Clearing transcript...");
        setState(prev => ({
            ...prev,
            transcript: "",
            persistentTranscript: "",
            translatedTranscript: ""
        }));
        lastSpokenRef.current = ""; // Reset TTS history too
    };

    // Background Translation Logic (Mirrors to English)
    useEffect(() => {
        if (!state.isRecording || lang === "en-US") return;

        // Check if TTS is enabled (passed from UI via state or some way)
        // Since we don't have isTTSEnabled in the state yet, let's assume we want to call it manually or check a ref
        // Actually, let's add it to the state so the hook knows about it.

        const translateLatest = async () => {
            const lastSegment = state.persistentTranscript.split(/[.!?\n]/).pop();
            if (!lastSegment || lastSegment.trim().length < 5) return;

            // Simulated Background AI Translation Service
            // In a production app, this would call Azure Translate / Google Cloud Translate
            console.log(`[Background] Translating segment: "${lastSegment}"`);

            // Mock Translation logic for demo purposes
            setTimeout(() => {
                setState(prev => {
                    if (prev.translatedTranscript.includes(lastSegment)) return prev;
                    const newMirror = " [EN Mirror: " + lastSegment.toUpperCase() + "]";

                    // Simple TTS (Speech Synthesis) for the translated part
                    if (isTTSEnabled && window.speechSynthesis && lastSpokenRef.current !== lastSegment) {
                        // Ensure we clean up any previous speech
                        window.speechSynthesis.cancel();

                        const utterance = new SpeechSynthesisUtterance(lastSegment);
                        utterance.lang = "en-US";
                        utterance.rate = 1.0;
                        window.speechSynthesis.speak(utterance);
                        lastSpokenRef.current = lastSegment;
                    }

                    return {
                        ...prev,
                        translatedTranscript: prev.translatedTranscript + newMirror
                    };
                });
            }, 600);
        };

        const timer = setTimeout(translateLatest, 600);
        return () => clearTimeout(timer);
    }, [state.persistentTranscript, state.isRecording, lang, isTTSEnabled]);

    useEffect(() => {
        return () => {
            console.log("useRecording cleanup effect.");
            teardown(); // Ensure all hardware is stopped on unmount
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    const setTranscript = (newText: string) => {
        setState(prev => ({
            ...prev,
            transcript: newText,
            persistentTranscript: newText // Sync persistent too so next result appends correctly
        }));
    };

    return {
        ...state,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        clearTranscript,
        setTranscript,
    };
};
