"use client";

import { useEffect, useState } from "react";
import { useRecording } from "@/hooks/useRecording";

interface AudioRecorderProps {
    onResult: (text: string | null) => void;
    onProcessing: (status: boolean) => void;
}

export default function AudioRecorder({ onResult, onProcessing }: AudioRecorderProps) {
    const { isRecording, transcript, duration, startRecording, stopRecording } = useRecording();
    const [lastTranscript, setLastTranscript] = useState("");

    // Update parent with live transcript
    useEffect(() => {
        if (transcript && transcript !== lastTranscript) {
            onResult(transcript);
            setLastTranscript(transcript);
        }
    }, [transcript, onResult, lastTranscript]);

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
            onProcessing(true);
            // In a real flow, we might wait for a final AI pass here,
            // but for "Active Transcription" we just stop and show results.
            setTimeout(() => onProcessing(false), 500);
        } else {
            onResult(null);
            setLastTranscript("");
            startRecording();
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto p-12 bg-white border border-zinc-200 rounded-[32px] shadow-2xl transition-all hover:shadow-zinc-200">
            <div className="flex flex-col items-center text-center">
                <div className="mb-8 relative">
                    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${isRecording ? 'border-red-500 scale-110' : 'border-black'}`}>
                        <div className={`w-4 h-4 rounded-full bg-red-500 transition-opacity ${isRecording ? 'animate-pulse' : 'opacity-0'}`}></div>
                    </div>
                    {isRecording && (
                        <div className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <h3 className="text-3xl font-black tracking-tighter">
                        {isRecording ? "Listening..." : "Ready to Capture"}
                    </h3>
                    {isRecording && (
                        <span className="font-mono text-sm font-bold text-red-500 uppercase tracking-widest">
                            {new Date(duration * 1000).toISOString().substr(14, 5)}
                        </span>
                    )}
                </div>

                <p className="text-zinc-500 mb-10 font-medium">
                    {isRecording
                        ? "Your conversation is being transcribed in real-time."
                        : "Click the button below to start your secure transcription session."}
                </p>

                <button
                    onClick={handleToggleRecording}
                    className={`w-full py-5 rounded-2xl text-xl font-bold transition-all transform active:scale-95 ${isRecording
                        ? "bg-zinc-100 text-black hover:bg-zinc-200 shadow-inner"
                        : "bg-black text-white hover:bg-zinc-800 shadow-xl"
                        }`}
                >
                    {isRecording ? "Stop Recording" : "Start Transcribing"}
                </button>

                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                    Web Speech API Active
                </div>
            </div>
        </div>
    );
}
