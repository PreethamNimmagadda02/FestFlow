import React, { useState, useRef, useEffect } from 'react';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FilePlusIcon } from './icons/FilePlusIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { LogOutIcon } from './icons/LogOutIcon';

interface HeaderProps {
    onResetClick: () => void;
    onDeleteCurrentClick: () => void;
    isPlanSaved: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    onLoadClick: () => void;
}

const AutoSaveIndicator: React.FC<{ status: HeaderProps['saveStatus'] }> = ({ status }) => {
    if (status === 'idle') return null;

    const content = {
        saving: { text: 'Saving...', icon: <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>, color: 'text-text-secondary' },
        saved: { text: 'All changes saved', icon: <CheckCircleIcon className="w-4 h-4" />, color: 'text-success' },
        error: { text: 'Error saving', icon: <XCircleIcon className="w-4 h-4" />, color: 'text-danger' },
    }[status];

    return (
        <div className={`flex items-center space-x-2 text-sm font-semibold transition-colors duration-300 ${content.color}`}>
            {content.icon}
            <span>{content.text}</span>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = React.memo(({ onResetClick, onDeleteCurrentClick, isPlanSaved, saveStatus, onLoadClick }) => {
    const { currentUser, loading, login, logout } = useAuth();
    const isAuthenticated = !!currentUser;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-secondary p-4 shadow-lg flex items-center justify-between border-b border-accent">
            <div className="flex items-center space-x-3">
                <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
            </div>
            <div className="flex items-center space-x-3">
                <AutoSaveIndicator status={saveStatus} />
                
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(prev => !prev)}
                        className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-highlight hover:text-white hover:border-highlight"
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                    >
                        <span>Actions</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <div 
                            className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-primary shadow-2xl border border-accent focus:outline-none z-50 animate-fadeIn"
                            style={{ animationDuration: '0.1s' }}
                            role="menu"
                            aria-orientation="vertical"
                        >
                            <div className="p-1">
                                <button
                                    onClick={() => { onLoadClick(); setIsMenuOpen(false); }}
                                    disabled={!isAuthenticated}
                                    className="w-full flex items-center space-x-3 rounded-md px-3 py-2 text-sm text-left text-light transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isAuthenticated ? "Load Session from Cloud" : "Please log in to load"}
                                    role="menuitem"
                                >
                                    <FolderOpenIcon className="w-4 h-4 text-text-secondary" />
                                    <span>Load Plan</span>
                                </button>
                                <button 
                                    onClick={() => { onResetClick(); setIsMenuOpen(false); }} 
                                    className="w-full flex items-center space-x-3 rounded-md px-3 py-2 text-sm text-left text-light transition-colors hover:bg-accent"
                                    title="Reset to a new, blank plan"
                                    role="menuitem"
                                >
                                    <FilePlusIcon className="w-4 h-4 text-text-secondary" />
                                    <span>New / Reset Plan</span>
                                </button>
                                <div className="border-t border-accent/50 my-1"></div>
                                <button
                                    onClick={() => { onDeleteCurrentClick(); setIsMenuOpen(false); }}
                                    disabled={!isPlanSaved || !isAuthenticated}
                                    className="w-full flex items-center space-x-3 rounded-md px-3 py-2 text-sm text-left text-red-400 transition-colors hover:bg-danger hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isPlanSaved ? "Delete Current Plan from Cloud" : "No plan is currently saved to the cloud"}
                                    role="menuitem"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    <span>Delete Current Plan</span>
                                </button>
                                {isAuthenticated && (
                                    <>
                                        <div className="border-t border-accent/50 my-1"></div>
                                        <button
                                            onClick={() => { logout(); setIsMenuOpen(false); }}
                                            className="w-full flex items-center space-x-3 rounded-md px-3 py-2 text-sm text-left text-red-400 transition-colors hover:bg-danger hover:text-white"
                                            role="menuitem"
                                            title="Logout"
                                        >
                                            <LogOutIcon className="w-4 h-4" />
                                            <span>Logout</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="w-px h-6 bg-accent mx-2"></div>
                {loading ? (
                    <div className="w-8 h-8 rounded-full bg-accent animate-pulse"></div>
                ) : currentUser ? (
                    <div className="flex items-center space-x-3">
                         <img src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} className="w-8 h-8 rounded-full border-2 border-highlight" title={`Logged in as ${currentUser.displayName}`}/>
                    </div>
                ) : (
                    <button 
                        onClick={login}
                        className="flex items-center space-x-2 rounded-lg bg-light px-3.5 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-opacity-90"
                    >
                        <GoogleIcon className="w-4 h-4" />
                        <span>Login</span>
                    </button>
                )}
            </div>
        </header>
    );
});
