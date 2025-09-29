import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';
import { getInstitutionDetails, getInstitutionSuggestions } from '../services/geminiService';

export const CompleteProfileModal: React.FC = () => {
    const { completeUserProfile } = useAuth();
    const [institution, setInstitution] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [userIsTyping, setUserIsTyping] = useState(true);
    const debounceTimeoutRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const suggestionsCache = useRef(new Map<string, string[]>());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const query = institution.trim();
        if (query.length > 2 && userIsTyping) {
            setShowSuggestions(true);

            if (suggestionsCache.current.has(query)) {
                setSuggestions(suggestionsCache.current.get(query)!);
                setIsFetchingSuggestions(false);
                return;
            }

            setIsFetchingSuggestions(true);
            debounceTimeoutRef.current = window.setTimeout(async () => {
                try {
                    const results = await getInstitutionSuggestions(institution);
                    suggestionsCache.current.set(query, results);
                    setSuggestions(results);
                } catch (e) {
                    console.error("Failed to fetch suggestions", e);
                    setSuggestions([]);
                } finally {
                    setIsFetchingSuggestions(false);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [institution, userIsTyping]);

    const handleSelectSuggestion = async (suggestion: string) => {
        setUserIsTyping(false);
        setInstitution(suggestion);
        setShowSuggestions(false);

        setIsFetchingDetails(true);
        setError(null);

        try {
            const details = await getInstitutionDetails(suggestion.trim());
            setCity(details.city || '');
            setState(details.state || '');
            setPincode(details.pincode || '');
        } catch (err) {
            console.error("Autofill failed:", err);
            const errorMessage = err instanceof Error ? err.message.split('\n')[0] : "Could not fetch details.";
            setError(`Autofill failed: ${errorMessage}. Please enter details manually.`);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (institution.trim() && city.trim() && state.trim() && pincode.trim()) {
            setIsSaving(true);
            setError(null);
            try {
                await completeUserProfile({
                    institution: institution.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    pincode: pincode.trim(),
                });
            } catch (err) {
                console.error("Failed to save profile:", err);
                setError("Sorry, we couldn't save your information. Please try again.");
                setIsSaving(false);
            }
        }
    };

    const isFormValid = institution.trim() && city.trim() && state.trim() && pincode.trim();

    return (
        <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center z-[100] p-4 text-center">
             <div 
                className="absolute inset-0 bg-cover bg-center bg-fixed" 
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
            />
            <div className="absolute inset-0 bg-primary opacity-60"></div>
            
            <div ref={containerRef} className="relative bg-secondary p-8 rounded-xl shadow-2xl border border-accent w-full max-w-lg animate-fadeIn">
                 <div className="mb-6 p-2 bg-highlight/10 rounded-full shadow-lg shadow-highlight/20 w-20 h-20 mx-auto flex items-center justify-center">
                    <FestFlowLogoIcon className="w-16 h-16 text-highlight" />
                </div>
                <h1 className="text-2xl font-bold text-light mb-2">Welcome to FestFlow!</h1>
                <p className="text-text-secondary mb-8">To get started, please tell us about your college or institution.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <div className="relative">
                            <input
                                type="text"
                                value={institution}
                                onChange={(e) => {
                                    setInstitution(e.target.value);
                                    setUserIsTyping(true);
                                }}
                                onFocus={() => institution.trim().length > 2 && userIsTyping && setShowSuggestions(true)}
                                placeholder="College / Institution Name"
                                className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                                required
                                aria-label="College or Institution Name"
                                autoComplete="off"
                            />
                             {showSuggestions && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-primary border border-accent rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {isFetchingSuggestions ? (
                                        <div className="p-3 text-text-secondary text-sm">Searching...</div>
                                    ) : suggestions.length > 0 ? (
                                        suggestions.map((s, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(s)}
                                                className="w-full text-left p-3 hover:bg-accent transition-colors text-light text-sm"
                                            >
                                                {s}
                                            </button>
                                        ))
                                    ) : institution.trim().length > 2 ? (
                                         <div className="p-3 text-text-secondary text-sm">No results found.</div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light disabled:opacity-70"
                            required
                            aria-label="City"
                            disabled={isFetchingDetails}
                        />
                        <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State / Province"
                            className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light disabled:opacity-70"
                            required
                            aria-label="State or Province"
                            disabled={isFetchingDetails}
                        />
                    </div>
                     <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="Pincode / ZIP Code"
                        className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light disabled:opacity-70"
                        required
                        aria-label="Pincode or ZIP Code"
                        disabled={isFetchingDetails}
                    />

                    {error && <p className="text-danger text-sm pt-2">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSaving || !isFormValid}
                        className="mt-4 w-full bg-gradient-to-r from-highlight to-violet-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-highlight/30"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Get Started'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
