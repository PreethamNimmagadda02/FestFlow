import React from 'react';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';

export const Header: React.FC = React.memo(() => {
    return (
        <header className="bg-secondary p-4 shadow-lg flex items-center justify-between border-b border-accent">
            <div className="flex items-center space-x-3">
                 <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                 <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
            </div>
            <p className="text-sm text-text-secondary hidden md:block">AI Event Orchestration</p>
        </header>
    );
});