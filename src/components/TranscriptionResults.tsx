"use client";

import { useState } from "react";

interface TranscriptionResultsProps {
    transcript: string | null;
    isProcessing: boolean;
}

export default function TranscriptionResults({ transcript, isProcessing }: TranscriptionResultsProps) {
    if (!transcript && !isProcessing) return null;

    return (
        <div className="w-full max-w-3xl mx-auto mt-12 bg-zinc-50 border border-zinc-200 rounded-[32px] overflow-hidden transition-all duration-500 ease-in-out shadow-inner">
            <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-black"></div>
                        <h4 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Secure Transcription Output</h4>
                    </div>
                    {isProcessing && (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-zinc-300 border-t-black rounded-full"></div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Processing...</span>
                        </div>
                    )}
                </div>

                <div className={`transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}>
                    {transcript ? (
                        <div className="prose prose-zinc lg:prose-xl max-w-none">
                            <p className="text-2xl font-medium leading-relaxed text-black tracking-tight">
                                {transcript}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="h-4 bg-zinc-200 rounded-full w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-zinc-200 rounded-full w-full animate-pulse"></div>
                            <div className="h-4 bg-zinc-200 rounded-full w-5/6 animate-pulse"></div>
                        </div>
                    )}
                </div>

                {transcript && (
                    <div className="mt-12 pt-8 border-t border-zinc-200 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <button className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Copy to EMR</button>
                            <button className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">Download PDF</button>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">
                            Transient Record: Will auto-delete on close
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
