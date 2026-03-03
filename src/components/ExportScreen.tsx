"use client";

export default function ExportScreen() {
    return (
        <div className="w-full text-center space-y-12 animate-in fade-in duration-1000">
            <div className="space-y-4">
                <div className="w-24 h-24 bg-teal-500 rounded-full mx-auto flex items-center justify-center text-white shadow-lg border-4 border-white">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 className="text-6xl font-black tracking-tighter">Session Finalized</h2>
                <p className="text-zinc-500 font-medium text-lg max-w-md mx-auto">
                    Your documentation is ready for export. PHI data will be purged upon session exit.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
                <button className="bg-black text-white py-5 rounded-2xl font-black text-xl hover:bg-zinc-800 hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Download .docx
                </button>
                <button className="bg-white text-zinc-900 border-2 border-zinc-100 py-5 rounded-2xl font-black text-xl hover:bg-zinc-50 hover:border-zinc-200 transition-all flex items-center justify-center gap-4 shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Form
                </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-8 text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
                <span className="font-black text-zinc-900 uppercase block mb-2">Privacy Assurance</span>
                This session lives entirely in your browser's memory. Once you download your files and close this tab, all trace of the patient data is permanently deleted from your computer.
            </div>
        </div>
    );
}
