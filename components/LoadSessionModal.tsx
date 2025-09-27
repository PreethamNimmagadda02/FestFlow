import React, { useState, useRef, useEffect } from 'react';
import { SavedSession } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { PencilIcon } from './icons/PencilIcon';

interface LoadSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: SavedSession[];
    onLoadSession: (sessionId: string, sessionName: string) => void;
    onDeleteSession: (sessionId: string) => Promise<void>;
    onUpdateSessionName: (sessionId: string, newName: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export const LoadSessionModal: React.FC<LoadSessionModalProps> = ({ isOpen, onClose, sessions, onLoadSession, onDeleteSession, onUpdateSessionName, isLoading, error }) => {
    if (!isOpen) return null;

    const [sessionToDelete, setSessionToDelete] = useState<SavedSession | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingSessionId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingSessionId]);

    const handleConfirmDelete = async () => {
        if (!sessionToDelete) return;
        setIsDeleting(true);
        try {
            await onDeleteSession(sessionToDelete.id);
            setSessionToDelete(null);
        } catch (err) {
            console.error("Deletion failed:", err);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleEditClick = (session: SavedSession) => {
        setEditingSessionId(session.id);
        setEditingName(session.name);
    };
    
    const handleSaveName = async () => {
        if (!editingSessionId) return;
        const originalSession = sessions.find(s => s.id === editingSessionId);
        if (originalSession && editingName.trim() && editingName !== originalSession.name) {
            await onUpdateSessionName(editingSessionId, editingName.trim());
        }
        setEditingSessionId(null);
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
                onClick={onClose}
            >
                <div 
                    className="bg-secondary rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                    onClick={e => e.stopPropagation()}
                    style={{animationDuration: '0.3s'}}
                >
                    <div className="p-4 border-b border-accent flex justify-between items-center">
                        <h3 className="text-lg font-bold text-highlight">Load Plan</h3>
                        <button onClick={onClose} className="text-text-secondary hover:text-white text-2xl">&times;</button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <svg className="animate-spin h-8 w-8 text-highlight" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            </div>
                        ) : error ? (
                            <div className="bg-danger/20 border border-danger text-red-300 p-4 rounded-lg">{error}</div>
                        ) : sessions.length === 0 ? (
                            <p className="text-text-secondary text-center py-10">No saved plans found in the cloud.</p>
                        ) : (
                            <ul className="space-y-3">
                                {sessions.map(session => (
                                    <li key={session.id} className="bg-primary p-3 rounded-lg border border-accent flex justify-between items-center transition-colors hover:bg-accent/30 group">
                                        <div className="flex-grow min-w-0">
                                            {editingSessionId === session.id ? (
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={handleSaveName}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveName();
                                                        if (e.key === 'Escape') setEditingSessionId(null);
                                                    }}
                                                    className="w-full bg-accent p-1 rounded-md text-light focus:outline-none focus:ring-2 focus:ring-highlight"
                                                />
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-semibold text-base text-light truncate" title={session.name}>{session.name}</p>
                                                    <button onClick={() => handleEditClick(session)} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-white transition-opacity p-1">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xs text-text-secondary mt-1">
                                                Saved on: {session.timestamp.toLocaleString()} ({session.taskCount} tasks)
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                            <button 
                                                onClick={() => onLoadSession(session.id, session.name)}
                                                className="px-4 py-2 rounded-lg bg-highlight text-white hover:opacity-90 transition-opacity text-sm font-semibold"
                                            >
                                                Load
                                            </button>
                                            <button
                                                onClick={() => setSessionToDelete(session)}
                                                className="p-2 rounded-lg text-text-secondary hover:bg-danger hover:text-white transition-colors"
                                                title="Delete this plan"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="p-4 border-t border-accent text-right">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            {sessionToDelete && (
                 <ConfirmationModal
                    isOpen={!!sessionToDelete}
                    onClose={() => setSessionToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Confirm Deletion"
                    message={
                        <>
                            Are you sure you want to permanently delete this plan?
                            <p className="mt-2 text-text-secondary bg-primary p-2 rounded-md font-semibold text-sm truncate">{sessionToDelete.name}</p>
                            This action cannot be undone.
                        </>
                    }
                    confirmText={isDeleting ? "Deleting..." : "Delete"}
                    confirmButtonClass="bg-danger hover:bg-danger/90"
                 />
            )}
        </>
    );
};
