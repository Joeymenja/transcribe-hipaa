"use client";

import { useState } from "react";

interface TranscriptReviewProps {
    roughTranscript: string;
    onContinue: (cleanTranscript: string) => void;
}

export default function TranscriptReview({ roughTranscript, onContinue }: TranscriptReviewProps) {
    const [cleanTranscript, setCleanTranscript] = useState(
        roughTranscript.replace(/\s+/g, ' ').trim() || "AI is currently refining your session capture..."
    );

    return (
        <div className="w-full text-left space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="space-y-4 text-center">
                <h2 className="text-5xl font-black tracking-tighter">Transcript Review</h2>
                <p className="text-zinc-500 font-medium max-w-xl mx-auto">
                    Compare the live rough draft with the AI-enhanced version before mapping to the intake form.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
                <div className="space-y-4 flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Live Rough Capture</label>
                    <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 overflow-y-auto text-sm text-zinc-400 font-medium italic shadow-inner">
                        {roughTranscript || "No audio was captured during this session."}
                    </div>
                </div>

                <div className="space-y-4 flex flex-col">
                    <label htmlFor="clean-enhancement" className="text-[10px] font-black uppercase tracking-widest text-zinc-900 ml-4">Clean AI Enhancement</label>
                    <textarea
                        id="clean-enhancement"
                        title="Clean AI Enhanced Transcript"
                        placeholder="Enhancing transcript..."
                        className="flex-1 bg-white border-2 border-zinc-100 rounded-[32px] p-8 text-lg text-zinc-900 font-bold focus:outline-none focus:border-black transition-all resize-none shadow-sm"
                        value={cleanTranscript}
                        onChange={(e) => setCleanTranscript(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => onContinue(cleanTranscript)}
                    className="bg-black text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
                >
                    Auto-Fill Assessment Form
                </button>
            </div>
        </div>
    );
}
