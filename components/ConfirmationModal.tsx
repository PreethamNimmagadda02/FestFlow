import React from 'react';

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmButtonClass?: string;
    cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'bg-danger text-white hover:bg-danger/90',
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fadeIn"
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
                    <h3 className="text-xl font-bold text-light mb-2">{title}</h3>
                    <div className="text-text-secondary space-y-2">
                        {message}
                    </div>
                </div>
                 <div className="p-4 bg-primary/50 rounded-b-xl flex justify-end items-center space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg transition-opacity font-semibold ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
