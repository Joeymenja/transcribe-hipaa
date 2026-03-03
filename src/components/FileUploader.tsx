"use client";

import { useState, useRef } from "react";

interface FileUploaderProps {
    onResult: (text: string | null) => void;
    onProcessing: (status: boolean) => void;
}

export default function FileUploader({ onResult, onProcessing }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
            alert("Please upload an audio or video file.");
            return;
        }

        onProcessing(true);
        onResult(null);

        try {
            const formData = new FormData();
            formData.append('audio', file);

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.text) {
                onResult(data.text);
            }
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            onProcessing(false);
        }
    };

    return (
        <div
            className={`w-full max-w-xl mx-auto mt-8 p-12 border-2 border-dashed rounded-[32px] transition-all cursor-pointer ${isDragging ? 'border-black bg-zinc-50 scale-[1.02]' : 'border-zinc-200 hover:border-zinc-400'
                }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                id="media-upload-input"
                title="Upload audio or video file"
                aria-label="Upload audio or video file"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                }}
                accept="audio/*,video/*"
            />
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 mb-6 bg-zinc-100 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400">
                        <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 15V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h4 className="text-xl font-bold mb-2">Upload pre-recorded media</h4>
                <p className="text-zinc-500 font-medium">Drag and drop or click to browse</p>
                <div className="mt-8 px-4 py-2 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Supports MP3, WAV, MP4, MOV
                </div>
            </div>
        </div>
    );
}
