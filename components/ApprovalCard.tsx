import React, { useState } from 'react';
import { Approval } from '../types';
import { AGENT_DETAILS } from '../constants';

interface ApprovalCardProps {
    approval: Approval;
    onDecision: (approvalId: string, decision: 'approved' | 'rejected', content?: string, customPrompt?: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = React.memo(({ approval, onDecision }) => {
    const agentDetail = AGENT_DETAILS[approval.agent];
    const Icon = agentDetail.icon;
    const [editableContent, setEditableContent] = useState(approval.content);
    const [customPrompt, setCustomPrompt] = useState('');

    return (
        <div className="bg-secondary p-5 rounded-xl shadow-2xl border-2 border-highlight/50 animate-fadeIn flex flex-col transition-all hover:border-highlight">
            <div className="flex-grow">
                <div className="flex items-center space-x-3 mb-4">
                    <Icon className={`w-6 h-6 ${agentDetail.color}`} />
                    <h3 className="text-lg font-bold text-light">{approval.title}</h3>
                </div>
                <div className="mb-4 bg-primary rounded-lg border border-accent">
                    <textarea
                        value={editableContent}
                        onChange={(e) => setEditableContent(e.target.value)}
                        className="w-full h-48 p-3 bg-transparent text-text-secondary whitespace-pre-wrap font-sans text-sm focus:outline-none focus:ring-1 focus:ring-highlight rounded-lg resize-y"
                        aria-label="Editable task result"
                    />
                </div>
                <div className="mb-4">
                     <label htmlFor={`custom-prompt-${approval.id}`} className="text-sm font-semibold text-text-secondary mb-2 block">
                        Provide a new prompt for regeneration (optional)
                    </label>
                    <textarea
                        id={`custom-prompt-${approval.id}`}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., Make this sound more energetic and add a call to action."
                        className="w-full h-24 p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                        aria-label="Custom prompt for regeneration"
                    />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 mt-auto pt-4">
                <button 
                    onClick={() => onDecision(approval.id, 'rejected', undefined, customPrompt.trim() || undefined)}
                    className="w-full sm:w-auto px-5 py-2 rounded-lg bg-warning text-white hover:opacity-90 transition-opacity font-semibold">
                    Regenerate
                </button>
                <button 
                    onClick={() => onDecision(approval.id, 'approved', editableContent)}
                    className="w-full sm:w-auto px-5 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-opacity font-semibold">
                    Approve
                </button>
            </div>
        </div>
    );
});