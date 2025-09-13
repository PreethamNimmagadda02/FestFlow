import React, { useRef, useEffect } from 'react';
import { ActivityLog } from '../types';
import { AGENT_DETAILS } from '../constants';

interface AgentActivityFeedProps {
    logs: ActivityLog[];
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = React.memo(({ logs }) => {
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div ref={feedRef} className="bg-secondary p-4 rounded-xl h-96 overflow-y-auto shadow-inner border border-accent">
            <div className="flex flex-col space-y-4">
                {logs.map((log, index) => {
                    const agentDetail = AGENT_DETAILS[log.agent];
                    const Icon = agentDetail.icon;
                    return (
                        <div key={index} className="flex items-start space-x-3 animate-fadeIn" style={{animationDelay: `${index*50}ms`, animationFillMode: 'backwards'}}>
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center ${agentDetail.color} border border-accent`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-light">{log.agent}</p>
                                <p className="text-sm text-text-secondary">{log.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{log.timestamp.toLocaleTimeString()}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});