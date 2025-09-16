import React, { useState } from 'react';
import { Task, Approval, ActivityLog, AgentName, AgentStatus } from '../types';
import { AGENT_NAMES, AGENT_DETAILS, AGENT_STATUS_STYLES } from '../constants';
import { TaskLane } from './TaskLane';
import { ApprovalCard } from './ApprovalCard';
import { AgentActivityFeed } from './AgentActivityFeed';
import { GanttChart } from './GanttChart';

interface AgentStatusGridProps {
    agentStatus: Record<AgentName, AgentStatus>;
    agentWork: Record<AgentName, string | null>;
}

const AgentStatusGrid: React.FC<AgentStatusGridProps> = React.memo(({ agentStatus, agentWork }) => {
    return (
        <div className="bg-secondary p-4 rounded-xl h-96 shadow-inner border border-accent flex flex-col">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2 -mr-3">
                {AGENT_NAMES.map(agentName => {
                    const status = agentStatus[agentName];
                    const work = agentWork[agentName];
                    const agentDetail = AGENT_DETAILS[agentName];
                    const statusStyle = AGENT_STATUS_STYLES[status];
                    const AgentIcon = agentDetail.icon;
                    const StatusIcon = statusStyle.icon;

                    return (
                        <div key={agentName} className="bg-primary p-4 rounded-lg border border-accent flex flex-col justify-between">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <AgentIcon className={`w-6 h-6 ${agentDetail.color}`} />
                                    <h4 className="font-bold text-light truncate">{agentName}</h4>
                                </div>
                                <p className="text-xs text-text-secondary mb-3">{agentDetail.description}</p>
                            </div>
                            <div>
                                 <div className={`flex items-center text-sm font-semibold ${statusStyle.color}`}>
                                    {StatusIcon && <StatusIcon className={`w-4 h-4 mr-2 ${status === AgentStatus.WORKING ? 'animate-spin' : ''}`} />}
                                    <span>{status}</span>
                                </div>
                                {work && (
                                    <p className="text-xs text-text-secondary mt-1 bg-secondary px-2 py-1 rounded-md truncate" title={work}>
                                        Task: {work}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const OverallProgress: React.FC<{ tasks: Task[] }> = React.memo(({ tasks }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (totalTasks === 0) {
        return (
            <div className="bg-secondary p-6 rounded-xl border border-accent text-center text-text-secondary">
                Waiting for tasks to be generated...
            </div>
        );
    }

    return (
        <div className="bg-secondary p-4 md:p-6 rounded-2xl border border-accent/50 shadow-2xl shadow-black/20 transition-all duration-300 hover:shadow-highlight/20 hover:border-highlight/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side: Title and Count */}
                <div className="flex-shrink-0">
                    <h4 className="font-bold text-lg text-light tracking-wide">Project Completion</h4>
                    <p className="text-sm font-semibold text-highlight">{completedTasks} of {totalTasks} tasks complete</p>
                </div>
                
                {/* Right side: Progress Bar and Percentage */}
                <div className="flex items-center gap-4 w-full md:w-3/5">
                    <div className="w-full bg-primary/70 rounded-full h-6 border border-accent/30 shadow-inner relative">
                        <div 
                            className="bg-gradient-to-r from-highlight to-violet-500 h-full rounded-full transition-all duration-1000 ease-in-out relative overflow-hidden"
                            style={{ width: `${progressPercentage}%` }}
                            role="progressbar"
                            aria-valuenow={progressPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Project completion progress"
                        >
                           <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer transform -skew-x-12"></div>
                        </div>
                    </div>
                    <span className="font-bold text-light text-xl w-16 text-right tabular-nums">{Math.round(progressPercentage)}%</span>
                </div>
            </div>
        </div>
    );
});


interface DashboardProps {
    tasks: Task[];
    approvals: Approval[];
    logs: ActivityLog[];
    agentStatus: Record<AgentName, AgentStatus>;
    agentWork: Record<AgentName, string | null>;
    onApproval: (approvalId: string, decision: 'approved' | 'rejected', newContent?: string, customPrompt?: string) => void;
    onCompleteTask: (taskId: string) => void;
    onReassignTask: (taskId: string, newAgent: AgentName) => void;
    onTaskClick: (task: Task) => void;
    onViewResult: (task: Task) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    tasks,
    approvals,
    logs,
    agentStatus,
    agentWork,
    onApproval,
    onCompleteTask,
    onReassignTask,
    onTaskClick,
    onViewResult
}) => {
    const [view, setView] = useState<'kanban' | 'gantt'>('kanban');

    const pendingApprovals = approvals.filter(a => a.status === 'pending');

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-xl font-bold mb-4 text-highlight">2. Monitor Agent Status & Activity</h2>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                         <AgentStatusGrid agentStatus={agentStatus} agentWork={agentWork} />
                    </div>
                    <div className="lg:col-span-2">
                        <AgentActivityFeed logs={logs} />
                    </div>
                </div>
            </div>

            {pendingApprovals.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 text-highlight flex items-center">
                        <span className="mr-2" role="img" aria-label="alarm">🚨</span> 3. Action Required: Approvals
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {pendingApprovals.map(approval => (
                            <ApprovalCard key={approval.id} approval={approval} onDecision={onApproval} />
                        ))}
                    </div>
                </div>
            )}

            <div>
                 <h2 className="text-xl font-bold text-highlight mb-4">{pendingApprovals.length > 0 ? '4.' : '3.'} Overall Progress</h2>
                 <OverallProgress tasks={tasks} />

                 <div className="flex justify-between items-center mt-6 mb-4">
                    <h3 className="text-lg font-bold text-light">Task Board</h3>
                    <div className="flex items-center space-x-2 bg-secondary p-1 rounded-lg border border-accent">
                        <button 
                            onClick={() => setView('kanban')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'kanban' ? 'bg-highlight text-white' : 'text-text-secondary hover:bg-accent'}`}
                        >
                            Agent Lanes
                        </button>
                         <button 
                            onClick={() => setView('gantt')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'gantt' ? 'bg-highlight text-white' : 'text-text-secondary hover:bg-accent'}`}
                        >
                            Timeline
                        </button>
                    </div>
                </div>

                {view === 'kanban' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {AGENT_NAMES.filter(name => name !== AgentName.MASTER_PLANNER).map(agentName => (
                            <TaskLane
                                key={agentName}
                                agentName={agentName}
                                tasks={tasks}
                                onCompleteTask={onCompleteTask}
                                agentStatus={agentStatus}
                                onReassign={onReassignTask}
                                onTaskClick={onTaskClick}
                                onViewResult={onViewResult}
                            />
                        ))}
                    </div>
                ) : (
                    <GanttChart tasks={tasks} onTaskClick={onTaskClick} />
                )}
            </div>
        </div>
    );
};
