import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';

export const CompleteProfileModal: React.FC = () => {
    const { completeUserProfile, currentUser } = useAuth();
    const [institution, setInstitution] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
             <div className="absolute inset-0 bg-cover bg-center bg-fixed opacity-10" 
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1974&auto.format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
            ></div>
             <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/80 to-primary"></div>
            
            <div className="relative bg-secondary p-8 rounded-xl shadow-2xl border border-accent w-full max-w-lg animate-fadeIn">
                 <div className="mb-6 p-2 bg-highlight/10 rounded-full shadow-lg shadow-highlight/20 w-20 h-20 mx-auto flex items-center justify-center">
                    <FestFlowLogoIcon className="w-16 h-16 text-highlight" />
                </div>
                <h1 className="text-2xl font-bold text-light mb-2">Welcome to FestFlow!</h1>
                <p className="text-text-secondary mb-8">To get started, please tell us about your college or institution.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="College / Institution Name"
                        className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                        required
                        aria-label="College or Institution Name"
                    />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                            required
                            aria-label="City"
                        />
                        <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State / Province"
                            className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                            required
                            aria-label="State or Province"
                        />
                    </div>
                     <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="Pincode / ZIP Code"
                        className="w-full text-left p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                        required
                        aria-label="Pincode or ZIP Code"
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
