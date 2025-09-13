import React from 'react';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';

const ResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4"/>
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2 8.1 8.1 0 0 0-4.07-4.9"/>
    <path d="M20 19v-4h-4"/>
  </svg>
);

interface HeaderProps {
    onReset: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onReset }) => {
    return (
        <header className="bg-secondary p-4 shadow-lg flex items-center justify-between border-b border-accent">
            <div className="flex items-center space-x-3">
                 <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                 <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
                <p className="text-sm text-text-secondary hidden sm:block">AI Event Orchestration</p>
                <button 
                    onClick={onReset} 
                    className="p-2 rounded-full text-text-secondary hover:bg-accent hover:text-light transition-colors"
                    title="Reset Plan"
                    aria-label="Reset Plan"
                >
                    <ResetIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
});