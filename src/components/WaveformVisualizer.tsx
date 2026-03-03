"use client";

import { useEffect, useState } from "react";

interface WaveformVisualizerProps {
    isRecording: boolean;
}

export default function WaveformVisualizer({ isRecording }: WaveformVisualizerProps) {
    const [bars, setBars] = useState<number[]>(new Array(40).fill(6));

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setBars(prev => prev.map(() => Math.max(6, Math.random() * 50)));
            }, 80);
        } else {
            setBars(new Array(40).fill(6));
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    return (
        <div className="waveform-container py-16 bg-zinc-50/50 rounded-[40px] border border-zinc-100 w-full mb-8">
            {bars.map((height, i) => (
                <div
                    key={i}
                    className="waveform-bar"
                    style={{
                        '--bar-height': `${height}px`,
                        '--bar-opacity': isRecording ? '1' : '0.2',
                        '--bar-color': isRecording ? '#121212' : '#d4d4d8'
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}
