import React, { useState } from 'react';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';

const ResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4"/>
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2 8.1 8.1 0 0 0-4.07-4.9"/>
    <path d="M20 19v-4h-4"/>
  </svg>
);

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);

interface HeaderProps {
    onReset: () => void;
}

const ResetConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
            style={{animationDuration: '0.2s'}}
        >
            <div 
                className="bg-secondary rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                onClick={e => e.stopPropagation()}
                style={{animationDuration: '0.3s'}}
            >
                <div className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
                            <WarningIcon className="w-6 h-6 text-danger" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-light mb-2">Confirm Reset</h3>
                    <p className="text-text-secondary">
                        Are you sure you want to reset? All current tasks, logs, and progress will be permanently deleted. This action cannot be undone.
                    </p>
                </div>
                 <div className="p-4 bg-primary/50 rounded-b-xl flex justify-end items-center space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger/90 transition-opacity font-semibold"
                    >
                        Confirm Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = React.memo(({ onReset }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleConfirmReset = () => {
        onReset();
        setIsModalOpen(false);
    };

    return (
        <>
            <header className="bg-secondary p-4 shadow-lg flex items-center justify-between border-b border-accent">
                <div className="flex items-center space-x-3">
                    <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                    <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <p className="text-sm text-text-secondary hidden sm:block">AI Event Orchestration</p>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-danger hover:text-white hover:border-danger"
                        title="Reset Plan"
                        aria-label="Reset Plan"
                    >
                        <ResetIcon className="w-4 h-4" />
                        <span>Reset</span>
                    </button>
                </div>
            </header>
            <ResetConfirmationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmReset}
            />
        </>
    );
});
