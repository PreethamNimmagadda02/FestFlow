import React from 'react';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';
import { SaveIcon } from './icons/SaveIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FilePlusIcon } from './icons/FilePlusIcon';

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

    return (
        <header className="bg-secondary p-4 shadow-lg flex items-center justify-between border-b border-accent">
            <div className="flex items-center space-x-3">
                <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
            </div>
            <div className="flex items-center space-x-3">
                <AutoSaveIndicator status={saveStatus} />
                 <button
                    onClick={onLoadClick}
                    disabled={!isAuthenticated}
                    className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-highlight hover:text-white hover:border-highlight disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isAuthenticated ? "Load Session from Cloud" : "Please log in to load"}
                    aria-label="Load Session"
                >
                    <FolderOpenIcon className="w-4 h-4" />
                    <span>Load</span>
                </button>
                <button 
                    onClick={onResetClick} 
                    className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-highlight hover:text-white hover:border-highlight"
                    title="Reset to a new, blank plan"
                    aria-label="New/Reset Plan"
                >
                    <FilePlusIcon className="w-4 h-4" />
                    <span>New / Reset</span>
                </button>
                 <button
                    onClick={onDeleteCurrentClick}
                    disabled={!isPlanSaved || !isAuthenticated}
                    className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-danger hover:text-white hover:border-danger disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isPlanSaved ? "Delete Current Plan from Cloud" : "No plan is currently saved to the cloud"}
                    aria-label="Delete Current Plan"
                >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete Plan</span>
                </button>
                <div className="w-px h-6 bg-accent mx-2"></div>
                {loading ? (
                    <div className="w-8 h-8 rounded-full bg-accent animate-pulse"></div>
                ) : currentUser ? (
                    <div className="flex items-center space-x-3">
                         <img src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} className="w-8 h-8 rounded-full border-2 border-highlight" title={`Logged in as ${currentUser.displayName}`}/>
                        <button onClick={logout} className="text-sm font-semibold text-text-secondary hover:text-white transition-colors">Logout</button>
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
