import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 animate-fadeIn rounded-xl bg-secondary border border-accent">
            <FestFlowLogoIcon className="w-24 h-24 text-highlight mb-4" />
            <h1 className="text-4xl font-bold text-light mb-2">Welcome to FestFlow</h1>
            <p className="text-lg text-text-secondary max-w-2xl mb-8">
                The AI-powered orchestration platform that transforms your high-level goals into perfectly executed events.
                Please sign in to begin creating and managing your plans.
            </p>
            <button
                onClick={login}
                className="flex items-center space-x-3 rounded-lg bg-light px-6 py-3 text-lg font-semibold text-primary transition-transform hover:scale-105 shadow-lg"
            >
                <GoogleIcon className="w-6 h-6" />
                <span>Sign In with Google</span>
            </button>
        </div>
    );
};
