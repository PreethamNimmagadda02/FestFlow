import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FilePlusIcon } from './icons/FilePlusIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { UserProfile } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { MenuIcon } from './icons/MenuIcon';

interface HeaderProps {
    onResetClick: () => void;
    onDeleteCurrentClick: () => void;
    isPlanSaved: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    onLoadClick: () => void;
    projectName: string | null;
    onUpdateProjectName: (newName: string) => void;
    userProfile: UserProfile | null;
    isStarted: boolean;
    onProfileClick: () => void;
}

const AutoSaveIndicator: React.FC<{ status: HeaderProps['saveStatus'] }> = ({ status }) => {
    if (status === 'idle') return null;

    const content = {
        saving: { text: 'Saving...', icon: <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>, color: 'text-text-secondary' },
        saved: { text: 'All changes saved', icon: <CheckCircleIcon className="w-4 h-4" />, color: 'text-success' },
        error: { text: 'Error saving', icon: <XCircleIcon className="w-4 h-4" />, color: 'text-danger' },
    }[status];

    return (
        <div className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-300 ${content.color}`}>
            {content.icon}
            <span>{content.text}</span>
        </div>
    );
};

const ProjectNameEditor: React.FC<{
    projectName: string;
    onUpdateProjectName: (newName: string) => void;
}> = ({ projectName, onUpdateProjectName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(projectName);
    const inputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number } | null>(null);

    useEffect(() => {
        setEditedName(projectName);
    }, [projectName]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editedName.trim() && editedName !== projectName) {
            onUpdateProjectName(editedName);
        }
        setIsEditing(false);
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleMouseEnter = () => {
        const titleElement = titleRef.current;
        if (titleElement && titleElement.scrollWidth > titleElement.clientWidth) {
            const rect = titleElement.getBoundingClientRect();
            const top = rect.bottom + 10; // 10px below the title
            const left = rect.left + rect.width / 2; // Centered horizontally with the title
            setTooltip({ visible: true, x: left, y: top });
        }
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const tooltipPortal = tooltip?.visible && createPortal(
        <div 
            style={{ top: tooltip.y, left: tooltip.x, transform: 'translateX(-50%)' }}
            className="fixed z-50 p-2 bg-primary border border-accent rounded-md shadow-lg text-sm text-light max-w-md break-words animate-fadeIn pointer-events-none"
        >
            {projectName}
        </div>,
        document.getElementById('tooltip-root')!
    );

    if (isEditing) {
        return (
            <div className="w-full flex items-center space-x-2 p-1.5 border-2 border-highlight rounded-lg bg-primary">
                <input
                    ref={inputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') {
                            setEditedName(projectName);
                            setIsEditing(false);
                        }
                    }}
                    className="bg-transparent text-center text-xl font-bold text-light focus:outline-none w-full"
                />
            </div>
        );
    }

    return (
        <>
            <div 
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="w-full flex items-center justify-center space-x-3 p-2 rounded-lg group cursor-pointer transition-colors"
            >
                <h2 ref={titleRef} className="text-xl font-bold text-light truncate min-w-0">{projectName}</h2>
                <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-full hover:bg-accent text-text-secondary hover:text-white transition-opacity flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Edit project name"
                >
                    <PencilIcon className="w-4 h-4" />
                </button>
            </div>
            {tooltipPortal}
        </>
    );
};

export const Header: React.FC<HeaderProps> = React.memo(({ onResetClick, onDeleteCurrentClick, isPlanSaved, saveStatus, onLoadClick, projectName, onUpdateProjectName, userProfile, isStarted, onProfileClick }) => {
    const { currentUser, loading, logout } = useAuth();
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
        <header className="bg-secondary p-3 shadow-lg flex items-center border-b border-accent h-20">
            {/* Left side container */}
            <div className="flex-1 flex justify-start">
                <div className="flex items-center space-x-3">
                    <FestFlowLogoIcon className="w-9 h-9 text-highlight" />
                    <h1 className="text-2xl font-bold tracking-wider text-light hidden md:block">FestFlow</h1>
                </div>
            </div>

            {/* Center title container */}
            <div className="flex-1 flex justify-center min-w-0 px-4">
                {isStarted && projectName && (
                   <ProjectNameEditor projectName={projectName} onUpdateProjectName={onUpdateProjectName} />
                )}
            </div>
            
            {/* Right side container */}
            <div className="flex-1 flex justify-end">
                <div className="flex items-center space-x-3">
                    <div className="hidden sm:block">
                        <AutoSaveIndicator status={saveStatus} />
                    </div>
                    
                    {loading ? (
                        <div className="w-9 h-9 rounded-full bg-accent animate-pulse"></div>
                    ) : (
                        currentUser && (
                            <button
                                onClick={onProfileClick}
                                className="flex items-center space-x-3 p-1 rounded-lg transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                                title="View My Profile"
                            >
                                <div className="text-right hidden md:block">
                                    <p className="font-semibold text-sm text-light truncate max-w-[200px]">{userProfile?.institution}</p>
                                </div>
                                <img src={currentUser.photoURL || undefined} alt="User Profile" className="w-9 h-9 rounded-full border-2 border-highlight"/>
                            </button>
                        )
                    )}

                    <div className="w-px h-6 bg-accent"></div>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            className="p-2 rounded-lg border-2 border-transparent text-text-secondary transition-colors hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:border-highlight"
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                            aria-label="Actions menu"
                        >
                            <MenuIcon className="w-5 h-5" />
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
                                        title={isAuthenticated ? "Load Plan from Cloud" : "Please log in to load"}
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
                </div>
            </div>
        </header>
    );
});
