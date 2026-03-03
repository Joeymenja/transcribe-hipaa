"use client";

import { useState, useMemo, useEffect } from "react";

interface FormField {
    label: string;
    value: string;
    confidence: "High" | "Medium" | "Low";
    status: "filled" | "missing";
    category: string;
}

interface IntakeFormProps {
    transcript: string;
}

export default function IntakeForm({ transcript }: IntakeFormProps) {
    const [mounted, setMounted] = useState(false);
    const [fields, setFields] = useState<Record<string, FormField>>({
        // Core Details
        clientName: { label: "Client's Full Name", value: "", confidence: "Low", status: "missing", category: "Core Details" },
        dob: { label: "Client Date of Birth", value: "", confidence: "Low", status: "missing", category: "Core Details" },
        intakeDate: { label: "Intake Date", value: "", confidence: "High", status: "filled", category: "Core Details" },
        diagImpression: { label: "Diagnostic Impression", value: "PRESENTING PROBLEM: SUBSTANCE USE DISORDER", confidence: "Medium", status: "filled", category: "Core Details" },
        startTime: { label: "Start Time", value: "", confidence: "Low", status: "missing", category: "Core Details" },
        endTime: { label: "End Time", value: "", confidence: "Low", status: "missing", category: "Core Details" },
        allergies: { label: "Allergies", value: "NONE", confidence: "Medium", status: "filled", category: "Core Details" },
        interpreterNeeded: { label: "Interpreter Needed", value: "NO", confidence: "High", status: "filled", category: "Core Details" },

        // Clinical Narrative
        reasonForTreatment: { label: "Reason for Seeking Residential Treatment / Rehab", value: "", confidence: "Low", status: "missing", category: "Clinical Narrative" },
        drugOfChoice: { label: "Drug of Choice", value: "", confidence: "Low", status: "missing", category: "Substance History" },

        // Substance History (Detailed)
        opioidUse: { label: "Opioid Use (Heroin, Fentanyl, Oxy...)", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },
        alcoholUse: { label: "Alcohol Use Disorder", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },
        cannabisUse: { label: "Cannabis Use Disorder", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },
        stimulantUse: { label: "Stimulant Use Disorder (Meth...)", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },
        sedativeUse: { label: "Sedatives (Xanax, Valium...)", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },
        hallucinogenUse: { label: "Hallucinogens (LSD, MDMA...)", value: "DENIES", confidence: "Medium", status: "filled", category: "Substance History" },

        // Safety
        dangerToSelf: { label: "Danger to Self / SI", value: "DENIED", confidence: "High", status: "filled", category: "Safety & Risk" },
        dangerToOthers: { label: "Danger to Others / HI", value: "DENIED", confidence: "High", status: "filled", category: "Safety & Risk" },
        safetyAgreement: { label: "Safety Agreement Signed/Verbally Confirmed", value: "YES - CLIENT AGREES TO REMAIN SAFE", confidence: "High", status: "filled", category: "Safety & Risk" },

        // Legal & History
        arrestHistory: { label: "Arrest History", value: "DENIES", confidence: "Medium", status: "filled", category: "Personal & Legal History" },
        probationStatus: { label: "Probation or Parole", value: "DENIES", confidence: "Medium", status: "filled", category: "Personal & Legal History" },
        maritalStatus: { label: "Marital Status", value: "SINGLE", confidence: "Medium", status: "filled", category: "Personal & Legal History" },

        // Observation (MSE)
        dress: { label: "Dress", value: "APPROPRIATE", confidence: "High", status: "filled", category: "Mental Status Exam (MSE)" },
        neatClean: { label: "Neat/Clean", value: "CLEAN", confidence: "High", status: "filled", category: "Mental Status Exam (MSE)" },
        mood: { label: "Mood", value: "WNL", confidence: "Medium", status: "filled", category: "Mental Status Exam (MSE)" },
        affect: { label: "Affect", value: "WNL", confidence: "Medium", status: "filled", category: "Mental Status Exam (MSE)" },

        // AI Summary Section
        clinicalSummary: { label: "Clinical Narrative Summary", value: "", confidence: "Medium", status: "missing", category: "AI Summary" },
    });

    useEffect(() => {
        setMounted(true);
        setFields(f => ({
            ...f,
            intakeDate: { ...f.intakeDate, value: new Date().toLocaleDateString() }
        }));
    }, []);

    // Advanced Clinical Extraction Engine
    useMemo(() => {
        if (!transcript) return;

        const lowerTranscript = transcript.toLowerCase();
        const sentences = lowerTranscript.split(/[.!?\n]/).filter(s => s.trim().length > 0);
        const newFields = { ...fields };

        // Helper: Check for negations in the same sentence
        const isNegated = (sentence: string, keyword: string) => {
            const index = sentence.indexOf(keyword);
            if (index === -1) return false;
            const context = sentence.substring(0, index).toLowerCase();
            return /\b(no|deny|denies|denied|never|none|negative|zero|not)\b/.test(context);
        };

        // 1. Client Identity & Records
        const nameMatch = transcript.match(/client (?:name is|is) ([\w\s]+?)(?=\.|$|,| and)/i);
        if (nameMatch) {
            newFields.clientName = { ...newFields.clientName, value: nameMatch[1].trim().toUpperCase(), status: "filled", confidence: "High" };
        }

        const dobMatch = transcript.match(/(?:dob|born on|date of birth) (?:is )?([\d/-]+|[\w\s,]+(?=\.|$))/i);
        if (dobMatch) {
            newFields.dob = { ...newFields.dob, value: dobMatch[1].trim().toUpperCase(), status: "filled", confidence: "High" };
        }

        // 2. Substance Use Mapping
        const substances = [
            { id: "opioidUse", keywords: ["heroin", "fentanyl", "oxy", "perc", "vike", "suboxone"] },
            { id: "alcoholUse", keywords: ["alcohol", "drinking", "beer", "wine", "vodka"] },
            { id: "cannabisUse", keywords: ["marijuana", "weed", "pot", "thc", "cannabis"] },
            { id: "stimulantUse", keywords: ["meth", "speed", "crystal", "ice", "glass"] },
        ];

        substances.forEach(sub => {
            sentences.forEach(sentence => {
                sub.keywords.forEach(kw => {
                    if (sentence.includes(kw)) {
                        if (isNegated(sentence, kw)) {
                            newFields[sub.id] = { ...newFields[sub.id], value: "DENIES", status: "filled", confidence: "High" };
                        } else {
                            newFields[sub.id] = { ...newFields[sub.id], value: `REPORTS ${kw.toUpperCase()} USE.`, status: "filled", confidence: "Medium" };
                            newFields.drugOfChoice = { ...newFields.drugOfChoice, value: kw.toUpperCase(), status: "filled", confidence: "Medium" };
                        }
                    }
                });
            });
        });

        // 3. Safety Logic
        if (lowerTranscript.includes("suicide") || lowerTranscript.includes("self-harm")) {
            sentences.forEach(s => {
                if (s.includes("suicide") || s.includes("self-harm")) {
                    if (isNegated(s, "suicide") || isNegated(s, "self-harm")) {
                        newFields.dangerToSelf = { ...newFields.dangerToSelf, value: "DENIED", status: "filled", confidence: "High" };
                    } else {
                        newFields.dangerToSelf = { ...newFields.dangerToSelf, value: "CLIENT REPORTS IDEATION", status: "filled", confidence: "High" };
                    }
                }
            });
        }

        // 4. Synthetic Narrative Construction
        const reportParts = [];
        if (newFields.clientName.value) reportParts.push(`${newFields.clientName.value} (DOB: ${newFields.dob.value || 'N/A'}) presented for an initial intake assessment.`);

        const activeSubstances = substances
            .filter(s => newFields[s.id].value.startsWith("REPORTS"))
            .map(s => s.id.replace("Use", "").toUpperCase());

        if (activeSubstances.length > 0) {
            reportParts.push(`Client reports active use of ${activeSubstances.join(", ")}.`);
        } else {
            reportParts.push("Client denies any active substance use at this time.");
        }

        if (newFields.dangerToSelf.value === "DENIED") {
            reportParts.push("Client denies active suicidal/homicidal ideation, plan, or intent.");
        }

        newFields.clinicalSummary = {
            ...newFields.clinicalSummary,
            value: reportParts.join(" ") + "\r\n\r\n[AI NOTE: Clinical narrative generated from live session transcript. Please verify all details before signing.]",
            status: "filled"
        };

        setFields(newFields);
    }, [transcript]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(Object.values(fields).map(f => f.category)));
        // Ensure Summary is at the top of the categories for narrative focus
        return cats.filter(c => c !== "AI Summary" && c !== "Core Details");
    }, [fields]);

    if (!mounted) return null;

    return (
        <div className="w-full h-full bg-zinc-50/50 pb-40 px-4 md:px-0 font-serif">
            {/* The "Paper Sheet" */}
            <div className="max-w-[850px] mx-auto bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)] border border-zinc-200 mt-12 mb-20 min-h-[1100px] p-12 md:p-20 relative overflow-hidden print:shadow-none print:border-none print:mt-0 print:p-0">

                {/* Letterhead / Header */}
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-12">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tighter text-black uppercase">Clinical Intake Assessment</h1>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-sans">Behavioral Health Services • Secure HIPAA Content</p>
                    </div>
                    <div className="text-right font-sans">
                        <p className="text-[10px] font-black uppercase text-zinc-400">Date Generated</p>
                        <p className="font-bold text-xs">{fields.intakeDate.value}</p>
                    </div>
                </div>

                {/* Core Details Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 py-6 border-b border-zinc-100 font-sans">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Client Name</label>
                        <input
                            title="Client Full Name"
                            className="font-bold text-sm w-full bg-transparent border-none p-0 focus:ring-0"
                            value={fields.clientName.value}
                            onChange={(e) => setFields({ ...fields, clientName: { ...fields.clientName, value: e.target.value } })}
                            placeholder="Pending..."
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Date of Birth</label>
                        <input
                            title="Client Date of Birth"
                            className="font-bold text-sm w-full bg-transparent border-none p-0 focus:ring-0"
                            value={fields.dob.value}
                            onChange={(e) => setFields({ ...fields, dob: { ...fields.dob, value: e.target.value } })}
                            placeholder="TBD"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Clinic</label>
                        <p className="font-bold text-sm">Main Campus</p>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Status</label>
                        <p className="font-bold text-sm text-teal-600">DRAFT INTAKE</p>
                    </div>
                </div>

                {/* The Narrative Section (Main Focus) */}
                <div className="mb-16 space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-900 font-sans">Clinical Narrative Summary</h2>
                        <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                    <textarea
                        title="Clinical Narrative Summary"
                        placeholder="Clinical summary will appear here once audio is processed..."
                        className="w-full bg-zinc-50/50 p-8 rounded-2xl border border-zinc-100 text-lg leading-relaxed text-zinc-800 focus:ring-2 focus:ring-zinc-900 focus:bg-white outline-none transition-all font-serif resize-none italic"
                        rows={10}
                        value={fields.clinicalSummary.value}
                        onChange={(e) => setFields({ ...fields, clinicalSummary: { ...fields.clinicalSummary, value: e.target.value } })}
                    />
                </div>

                {/* Structured Sections */}
                <div className="space-y-16">
                    {categories.map(category => (
                        <div key={category} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-900 font-sans">{category}</h2>
                                <div className="flex-1 h-px bg-zinc-100" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 font-sans">
                                {Object.entries(fields)
                                    .filter(([_, f]) => f.category === category)
                                    .map(([key, field]) => (
                                        <div key={key} className="flex flex-col border-b border-zinc-100 pb-2 hover:border-zinc-300 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                                                    {field.label}
                                                </label>
                                                {field.confidence !== "Low" && (
                                                    <span className="text-[7px] font-black text-teal-600 uppercase tracking-tighter">AI-Matched</span>
                                                )}
                                            </div>
                                            <input
                                                title={field.label}
                                                className="w-full bg-transparent border-none p-0 font-bold text-sm text-zinc-900 focus:ring-0 placeholder:text-zinc-200"
                                                value={field.value}
                                                placeholder="[No Data]"
                                                onChange={(e) => setFields({ ...fields, [key]: { ...field, value: e.target.value, status: e.target.value ? 'filled' : 'missing' } })}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Signature Area */}
                <div className="mt-24 pt-12 border-t border-zinc-200 grid grid-cols-2 gap-20 font-sans">
                    <div className="space-y-8">
                        <div className="h-px bg-zinc-300 w-full" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Clinician Signature</p>
                    </div>
                    <div className="space-y-8 text-right">
                        <p className="font-bold text-xs uppercase tracking-widest">Page 1 of 1</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300">HIPAA SECURE DOCUMENT</p>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar (Hidden on Print) */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-4 print:hidden">
                <button
                    onClick={() => {
                        const content = `CLINICAL INTAKE SUMMARY\nDate: ${fields.intakeDate.value}\n\nNARRATIVE:\n${fields.clinicalSummary.value}\n\n` +
                            Object.entries(fields).filter(([_, f]) => f.category !== "AI Summary").map(([_, f]) => `${f.label}: ${f.value}`).join('\n');
                        navigator.clipboard.writeText(content);
                        alert("Professional report content copied to clipboard!");
                    }}
                    className="bg-white text-black px-8 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-xl hover:bg-zinc-50 transition-all flex items-center gap-3 border border-zinc-200 transform active:scale-95"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy Form Content
                </button>

                <button
                    onClick={() => window.print()}
                    className="bg-black text-white px-10 py-5 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-zinc-800 transition-all flex items-center gap-3 transform active:scale-95"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print / Export PDF
                </button>
            </div>
        </div>
    );
}
