import React, { useState } from 'react';

interface FestivalSetupFormProps {
    onSubmit: (goal: string) => void;
    isLoading: boolean;
}

export const FestivalSetupForm: React.FC<FestivalSetupFormProps> = React.memo(({ onSubmit, isLoading }) => {
    const [goal, setGoal] = useState<string>('Organize a 3-day robotics competition from Oct 1-3 with 50 participants and seek 3 sponsors.');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (goal.trim() && !isLoading) {
            onSubmit(goal.trim());
        }
    };

    return (
        <div className="bg-secondary p-6 rounded-xl shadow-2xl border border-accent animate-fadeIn">
            <h2 className="text-xl font-bold mb-2 text-highlight">1. Define Your Festival Goal</h2>
            <p className="text-text-secondary mb-4">Describe your festival in one sentence. The AI agents will break it down into actionable tasks.</p>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g., Organize a 3-day music festival in December with 5 bands and a budget of $10,000."
                    className="w-full h-24 p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="mt-4 w-full bg-gradient-to-r from-highlight to-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-highlight/30"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Initializing Agents...
                        </>
                    ) : (
                        'Generate Plan'
                    )}
                </button>
            </form>
        </div>
    );
});