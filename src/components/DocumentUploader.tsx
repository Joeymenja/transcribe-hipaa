"use client";

import { useState } from "react";
import mammoth from "mammoth";

interface DocumentUploaderProps {
    onTextExtracted: (text: string, rawBuffer?: ArrayBuffer) => void;
}

export default function DocumentUploader({ onTextExtracted }: DocumentUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);

        try {
            if (file.name.endsWith(".docx")) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                onTextExtracted(result.value, arrayBuffer);
            } else {
                // Simple text extraction for .txt/.md files
                const text = await file.text();
                onTextExtracted(text);
            }
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Error reading file. Please ensure it's a valid .docx or .txt file.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-200 rounded-3xl cursor-pointer hover:bg-zinc-50 transition-all bg-white group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <svg className="w-8 h-8 mb-4 text-zinc-400 group-hover:text-black transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                    </svg>
                    <p className="mb-2 text-sm text-zinc-500 font-bold uppercase tracking-widest">
                        {isUploading ? "Analysing Structure..." : fileName ? fileName : "Upload Clinical Template"}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono tracking-tighter">
                        Supports .docx, .txt, .md
                    </p>
                </div>
                <input type="file" className="hidden" accept=".docx,.txt,.md" onChange={handleFileUpload} />
            </label>
        </div>
    );
}
