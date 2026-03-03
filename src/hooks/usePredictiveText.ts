import { useState, useEffect } from 'react';

// Basic mock clinical dataset
// In a production app, this would be an LLM API call (e.g., OpenAI/Anthropic)
const clinicalCorpus: Record<string, string[]> = {
    // Subjective / Presentation
    "patient denies": ["suicidal ideation", "homicidal ideation", "any side effects", "current distress"],
    "patient reports": ["feeling overwhelmed", "improved mood", "increased anxiety", "difficulty sleeping"],
    "history of": ["presenting problem", "substance abuse", "trauma", "severe depression"],
    "symptoms of": ["anxiety", "major depressive disorder", "panic attacks"],
    "chief complaint": ["is worsening depression", "is escalating panic", "is relationship issues"],

    // Objective / MSE
    "client appears": ["well groomed", "disheveled", "cooperative", "guarded"],
    "mood is": ["euthymic", "depressed", "anxious", "irritable"],
    "affect is": ["congruent", "blunted", "labile", "flat"],
    "thought process is": ["linear and logical", "tangential", "circumstantial"],
    "speech is": ["within normal limits", "pressured", "latency of response"],
    "eye contact is": ["appropriate", "poor", "intense"],

    // Plan / Assesment
    "diagnosis of": ["major depressive disorder", "generalized anxiety disorder", "PTSD"],
    "plan to": ["continue current medication", "refer to psychiatry", "increase session frequency"],
    "will continue": ["to monitor symptoms", "current treatment plan", "weekly therapy"],
};

export const usePredictiveText = (transcript: string, sessionContext: string = "") => {
    const [suggestion, setSuggestion] = useState<string>("");

    useEffect(() => {
        if (!transcript || transcript.trim().length === 0) {
            setSuggestion("");
            return;
        }

        // Only predict if the user is actively typing/speaking (ends with a space or letter)
        // Don't predict if they just hit enter.
        if (transcript.endsWith("\n")) {
            setSuggestion("");
            return;
        }

        const normalizedTranscript = transcript.toLowerCase();

        // Find the last 2-3 words to use as the "trigger" phrase
        const words = normalizedTranscript.trim().split(/\s+/);
        let trigger = "";

        if (words.length >= 2) {
            trigger = words.slice(-2).join(" ");
        }

        let foundSuggestion = "";

        // Check our local corpus for matches
        for (const [key, predictions] of Object.entries(clinicalCorpus)) {
            if (trigger === key) {
                // Return the first prediction for now (could randomize or rank by context)
                foundSuggestion = predictions[0];
                break;
            }
        }

        // Optional: If we have sessionContext, we could theoretically boost words that appear in it.
        // For this mock, we just use the static corpus.

        // If the transcript ends with a space, the suggestion should not start with one.
        if (foundSuggestion && !transcript.endsWith(" ")) {
            foundSuggestion = " " + foundSuggestion;
        }

        setSuggestion(foundSuggestion);

    }, [transcript, sessionContext]);

    const clearSuggestion = () => setSuggestion("");

    return {
        suggestion,
        clearSuggestion
    };
};
