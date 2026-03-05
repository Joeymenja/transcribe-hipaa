"use client";

import { useRecording } from "@/hooks/useRecording";
import { usePredictiveText } from "@/hooks/usePredictiveText";
import DocumentUploader from "@/components/DocumentUploader";
import { useEffect, useRef, useState } from "react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver"; // Need to install this too

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [isEnglishFocus, setIsEnglishFocus] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const {
    isRecording,
    isPaused,
    transcript,
    translatedTranscript,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscript,
    setTranscript,
    error,
    isInitializing
  } = useRecording(selectedLanguage, isTTSEnabled);
  const [mounted, setMounted] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showCopiedAI, setShowCopiedAI] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isStealth, setIsStealth] = useState(false);
  const [sessionContext, setSessionContext] = useState("");
  const [templateBuffer, setTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const { suggestion, clearSuggestion } = usePredictiveText(transcript, sessionContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Stealth Mode
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        setIsStealth(prev => !prev);
      }
      // Ctrl+C: Normal Copy (Only if no text selected to avoid overriding browser)
      if (e.ctrlKey && e.key === "c" && !window.getSelection()?.toString()) {
        handleCopy();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transcript]);

  // Auto-scroll to bottom as transcript grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (suggestion && (e.key === "Tab" || e.key === "ArrowRight")) {
      e.preventDefault(); // Prevent focus shift or cursor move
      setTranscript(transcript + suggestion);
      clearSuggestion();

      // Move cursor to end of contentEditable (requires a short delay for React to render)
      setTimeout(() => {
        if (editorRef.current) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 0);
    }
  };

  const isSupported = typeof window !== 'undefined' &&
    (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleCopyForAI = () => {
    if (!transcript) return;
    const clinicalPrompt = `CONTEXT: You are a professional behavioral health case manager or social worker.
OBJECTIVE: Summarize the following session transcript into a targeted case management note. 
INSTRUCTIONS: 
1. Do NOT use the standard SOAP format.
2. Structure the note exactly into three sections: "NOTES", "Follow-Up Plan:", and "Relevant Treatment Goals Addressed:".
3. Under "NOTES", write a concise paragraph summarizing the objective facts of the session (e.g., client cooperation, missed/rescheduled appointments, transportation issues, client understanding of plans).
4. Under "Follow-Up Plan:", write actionable sentences detailing specific coordination, phone calls, community outings, or resource navigation planned based on the transcript.
5. Under "Relevant Treatment Goals Addressed:", list overarching goals (e.g., "Daily Routine Development", "Housing/Transition Planning", "Social Reconnection") and briefly describe how the session addressed them.
6. Focus heavily on practical needs (phones, IDs, probation compliance, housing, hygiene apps) and community reintegration.

${sessionContext ? `\nREFERENCE CONTEXT (LEARNED FROM TEMPLATE):\n${sessionContext}\n` : ""}

EXAMPLE OUTPUT STYLE:
NOTES
Client cooperative with ROI signing process. Missed clinic appointment today due to transportation difficulty locating residence. Appointment successfully rescheduled for March 11. Client understands domestic violence classes will be paused during residential treatment and will resume after discharge.

Follow-Up Plan:
Facilitate phone call to girlfriend confirming hospital location and coordinating visit
Assist with online SIM card service application...

Relevant Treatment Goals Addressed:
Daily Routine Development: Supporting practical needs management...

TRANSCRIPT:
${transcript}

${translatedTranscript ? `EN MIRROR TRANSCRIPT:\n${translatedTranscript}` : ""}
`;
    navigator.clipboard.writeText(clinicalPrompt);
    setShowCopiedAI(true);
    setTimeout(() => setShowCopiedAI(false), 2000);
  };

  const handleFillDocument = async () => {
    if (!templateBuffer || !transcript) return;
    setIsGeneratingDoc(true);
    try {
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Simple heuristic mapping: find keywords in transcript for docx placeholders
      // In a real app, this would be a more complex AI-driven mapping
      doc.render({
        transcript: transcript,
        summary: "Clinical summery generated from live session.",
        date: new Date().toLocaleDateString(),
        // Add more dynamic fields here as needed
      });

      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      saveAs(out, `Finalized_Intake_${new Date().getTime()}.docx`);
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Error filling document template. Ensure placeholders like {transcript} exist.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col overflow-hidden">
      {/* Action Bar (Top) */}
      <div className="z-20 p-3 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md border-b border-zinc-100 w-full min-w-0">
        <div className="flex flex-col w-full md:w-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
            <div className={`shrink-0 w-3 h-3 rounded-full ${isRecording ? (isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse') : 'bg-zinc-200'}`} />
            <span className="font-mono text-sm md:text-lg font-black tracking-tighter uppercase truncate">
              {isInitializing ? "Initializing..." : isRecording ? (isPaused ? "Paused" : "Live Transcription") : "Ready"}
            </span>
            {isRecording && (
              <span className="ml-0 md:ml-4 font-mono text-zinc-400 font-bold text-xs md:text-base shrink-0">
                {new Date(duration * 1000).toISOString().substr(14, 5)}
              </span>
            )}
            {!isRecording && (
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                title="Select Input Language"
                className="ml-4 bg-zinc-50 border-none text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md focus:ring-0 cursor:pointer hover:bg-zinc-100 transition-colors"
              >
                <option value="en-US">🇺🇸 English</option>
                <option value="es-ES">🇪🇸 Spanish</option>
                <option value="fr-FR">🇫🇷 French</option>
                <option value="pt-BR">🇧🇷 Portuguese</option>
                <option value="it-IT">🇮🇹 Italian</option>
                <option value="de-DE">🇩🇪 German</option>
                <option value="zh-CN">🇨🇳 Chinese</option>
                <option value="ja-JP">🇯🇵 Japanese</option>
                <option value="ar-SA">🇸🇦 Arabic</option>
                <option value="hi-IN">🇮🇳 Hindi</option>
              </select>
            )}
            {isRecording && selectedLanguage !== "en-US" && (
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => setIsEnglishFocus(!isEnglishFocus)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${isEnglishFocus ? 'bg-teal-500 text-white border-teal-500 shadow-lg' : 'bg-white text-zinc-400 border-zinc-200'
                    }`}
                >
                  {isEnglishFocus ? "HUD Mode: ON" : "HUD Mode: OFF"}
                </button>
                <button
                  onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${isTTSEnabled ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-zinc-400 border-zinc-200'
                    }`}
                >
                  {isTTSEnabled ? "Voice: ON" : "Voice: OFF"}
                </button>
              </div>
            )}
            {isRecording && (
              <span className="ml-4 px-2 py-0.5 bg-zinc-900 text-white text-[8px] font-black uppercase rounded-md tracking-tighter">
                {selectedLanguage === "en-US" ? "English Mode" : "Translation Mode"}
              </span>
            )}

            {/* Stealth Toggle (Top Bar) */}
            <div className="flex items-center gap-2 ml-auto md:ml-6 md:pl-6 md:border-l border-zinc-100">
              <button
                onClick={() => setIsStealth(!isStealth)}
                title="Stealth Mode (Ctrl+S)"
                className={`p-1.5 rounded-lg transition-all ${isStealth ? 'bg-zinc-900 text-white shadow-lg' : 'bg-transparent text-zinc-300 hover:text-zinc-500'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.05 12a10.06 10.06 0 0 1 19.9 0 10.06 10.06 0 0 1-19.9 0Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
          {mounted && !isSupported && (
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">
              ⚠️ Browser Not Supported (Use Edge/Chrome)
            </span>
          )}
          {mounted && error && (
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">
              ⚠️ {error}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
            {/* Idle State */}
            {!isRecording && (
              <button
                onClick={startRecording}
                disabled={!mounted || !isSupported}
                className="w-full md:w-auto px-6 md:px-10 py-4 md:py-4 rounded-full font-black text-sm md:text-lg bg-black text-white hover:bg-zinc-800 transition-all transform active:scale-95 shadow-xl disabled:opacity-50 font-mono"
              >
                {!mounted ? "Initializing..." : "Start Transcribing"}
              </button>
            )}

            {/* Active State (Live or Paused) */}
            {isRecording && (
              <>
                {isPaused ? (
                  <button
                    onClick={resumeRecording}
                    className="w-full md:w-auto px-6 md:px-10 py-3 md:py-4 rounded-full font-black text-base md:text-lg bg-black text-white hover:bg-zinc-800 transition-all transform active:scale-95 shadow-2xl font-mono"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseRecording}
                    className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-full font-black text-base md:text-lg bg-zinc-100 text-black hover:bg-zinc-200 transition-all transform active:scale-95 font-mono"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={stopRecording}
                  className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-full font-black text-base md:text-lg bg-zinc-900 text-white hover:bg-black transition-all transform active:scale-95 font-mono"
                >
                  Finish Session
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-20 scroll-smooth selection:bg-black selection:text-white pt-6 md:pt-32 min-w-0"
      >
        <div className="max-w-5xl mx-auto w-full min-w-0">
          <div className={`space-y-6 md:space-y-12 transition-all duration-500 w-full min-w-0 ${isStealth ? 'blur-2xl opacity-10 hover:blur-none hover:opacity-100' : ''}`}>
            {!transcript && !isRecording && (
              <div className="h-full flex flex-col items-center justify-center pt-32 space-y-12">
                <div className="flex flex-col items-center space-y-4 opacity-20">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                  <p className="text-2xl font-black uppercase tracking-[0.3em]">
                    {!mounted ? "System Ready" : isSupported ? "Hit Start to Begin" : "Unsupported Browser"}
                  </p>
                </div>
              </div>
            )}
            <div className={`transition-all duration-700 ${isEnglishFocus ? 'text-teal-600' : ''} text-2xl md:text-6xl font-black leading-snug md:leading-[1.1] tracking-tight whitespace-pre-wrap break-words relative w-full min-w-0`}>
              {isEnglishFocus ? (
                <div>{translatedTranscript || "Scanning for Speech..."}</div>
              ) : (
                <div className="relative group" data-gramm="true" data-gramm_editor="true">
                  <div
                    ref={editorRef}
                    contentEditable={!isEnglishFocus}
                    onInput={(e) => setTranscript((e.currentTarget as HTMLDivElement).innerText)}
                    onBlur={(e) => setTranscript((e.currentTarget as HTMLDivElement).innerText)}
                    onKeyDown={handleEditorKeyDown}
                    suppressContentEditableWarning={true}
                    title="Live Transcript Editor"
                    data-gramm="true"
                    data-gramm_editor="true"
                    className="w-full min-w-0 bg-transparent border-none p-0 focus:ring-0 outline-none min-h-[400px] font-black pointer-events-auto break-words"
                  >
                    {transcript}
                    {suggestion && (
                      <span
                        contentEditable={false}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTranscript(transcript + suggestion);
                          clearSuggestion();

                          // Move cursor to end
                          setTimeout(() => {
                            if (editorRef.current) {
                              const range = document.createRange();
                              const sel = window.getSelection();
                              range.selectNodeContents(editorRef.current);
                              range.collapse(false);
                              sel?.removeAllRanges();
                              sel?.addRange(range);
                            }
                          }, 0);
                        }}
                        className="text-zinc-300 cursor-pointer select-none italic absolute whitespace-pre z-10"
                      >
                        {suggestion}
                        <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-md no-italic not-sr-only">Tab or Tap</span>
                      </span>
                    )}
                    {(isRecording || isInitializing) && (
                      <span contentEditable={false} className={`inline-block w-1 h-10 md:w-2 md:h-14 ${isEnglishFocus ? 'bg-teal-400' : 'bg-black'} animate-pulse rounded-full ml-2 align-middle`} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Native Language Mirror (When in English Focus) */}
            {isEnglishFocus && transcript && (
              <div className="mt-12 p-10 bg-zinc-900 rounded-[50px] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-transparent opacity-50" />
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Native Audio Source</span>
                </div>
                <p className="text-xl font-bold text-zinc-300 leading-relaxed font-mono">
                  {transcript}
                </p>
              </div>
            )}

            {/* Live English Mirror (When NOT in English Focus) */}
            {!isEnglishFocus && translatedTranscript && (
              <div className="mt-8 p-8 bg-zinc-50 rounded-[40px] border border-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center gap-2 mb-4 opacity-40">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live English Mirror</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-zinc-400 leading-relaxed italic">
                  {translatedTranscript}
                </p>
              </div>
            )}

            {/* Minimalist Utilities (Copy & Clear) */}
            {transcript && (
              <div className="flex flex-wrap justify-start gap-6 pt-8 border-t border-zinc-50 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {/* Standard Copy Button */}
                <button
                  onClick={handleCopy}
                  className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-zinc-50 transition-all active:scale-95"
                  title="Copy pure transcript"
                >
                  <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-200 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
                    {showCopied ? "Copied!" : "Copy Transcript"}
                  </span>
                </button>

                {/* Copy for AI Button (New) */}
                <button
                  onClick={handleCopyForAI}
                  className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-teal-50 transition-all active:scale-95"
                  title="Copy formatted with clinical prompt"
                >
                  <div className="p-2 bg-teal-100/50 rounded-lg group-hover:bg-teal-200/50 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-600/60 group-hover:text-teal-700 transition-colors">
                    {showCopiedAI ? "Copied Prompt!" : "Copy for External AI"}
                  </span>
                </button>

                {/* Clear Button */}
                <div className="flex items-center mt-4 md:mt-0 md:ml-auto w-full md:w-auto">
                  {isConfirmingClear ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 transition-all w-full justify-between md:justify-end">
                      <button
                        onClick={() => {
                          clearTranscript();
                          setIsConfirmingClear(false);
                        }}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100"
                      >
                        Confirm Clear
                      </button>
                      <button
                        onClick={() => setIsConfirmingClear(false)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingClear(true)}
                      className="group flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-red-50 transition-all active:scale-95"
                      title="Clear session"
                    >
                      <div className="p-2 bg-zinc-100 group-hover:bg-red-100 rounded-lg transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-red-500">
                          <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-red-500 transition-colors">
                        Clear Session
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistence Warning (Bottom) */}
      <div className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-white border-t border-zinc-50 pointer-events-none">
        RAM-ONLY SESSION • DATA PURGED ON CLOSE
      </div>
    </div>
  );
}
