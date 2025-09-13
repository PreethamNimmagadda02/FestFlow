import React, { useMemo } from 'react';
import { Task, Approval, ActivityLog, AgentName, AgentStatus, TaskStatus } from '../types';
import { AgentActivityFeed } from './AgentActivityFeed';
import { TaskLane } from './TaskLane';
import { ApprovalCard } from './ApprovalCard';
import { AGENT_NAMES, AGENT_STATUS_STYLES, AGENT_DETAILS } from '../constants';

interface DashboardProps {
    tasks: Task[];
    approvals: Approval[];
    logs: ActivityLog[];
    agentStatus: Record<AgentName, AgentStatus>;
    agentWork: Record<AgentName, string | null>;
    onApproval: (approvalId: string, decision: 'approved' | 'rejected', content?: string) => void;
    onCompleteTask: (taskId: string) => void;
    onReassignTask: (taskId: string, newAgent: AgentName) => void;
}

interface AgentStatusIndicatorProps {
    name: AgentName;
    status: AgentStatus;
    currentTask: string | null;
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = React.memo(({ name, status, currentTask }) => {
    const statusStyle = AGENT_STATUS_STYLES[status];
    const agentDetail = AGENT_DETAILS[name];
    const StatusIcon = statusStyle.icon;

    return (
        <div className="w-full flex flex-col justify-between h-full">
            <div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                         <agentDetail.icon className={`w-5 h-5 ${agentDetail.color}`} />
                         <span className="font-bold text-sm">{name}</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs font-bold px-2 py-1 rounded-full ${status === AgentStatus.WORKING ? 'bg-success/20 text-success' : status === AgentStatus.ERROR ? 'bg-danger/20 text-danger' : 'bg-accent text-text-secondary'}`}>
                        {StatusIcon && <StatusIcon className={`w-4 h-4 ${status === AgentStatus.WORKING ? 'animate-pulse' : ''}`}/>}
                        <span>{status}</span>
                    </div>
                </div>
            </div>
            {status === AgentStatus.WORKING && currentTask ? (
                <p className="text-xs text-text-secondary italic mt-2 truncate" title={currentTask}>
                   Working on: {currentTask}
                </p>
            ) : <p className="text-xs text-text-secondary italic mt-2">{agentDetail.description}</p>
            }
        </div>
    );
});


export const Dashboard: React.FC<DashboardProps> = React.memo(({ tasks, approvals, logs, agentStatus, agentWork, onApproval, onCompleteTask, onReassignTask }) => {
    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    
    const { completedProgress, overallProgress, completedTasksCount, totalTasksCount } = useMemo(() => {
        const completedCount = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const totalCount = tasks.length;
        
        const completed = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        
        const totalSum = tasks.reduce((acc, task) => {
            if (task.status === TaskStatus.COMPLETED) return acc + 100;
            return acc + (task.progress || 0);
        }, 0);
        
        const overall = totalCount > 0 ? totalSum / totalCount : 0;

        return {
            completedProgress: completed,
            overallProgress: overall,
            completedTasksCount: completedCount,
            totalTasksCount: totalCount
        };
    }, [tasks]);


    return (
        <div className="space-y-8 animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
            <div>
                <h2 className="text-xl font-bold mb-4 text-highlight">2. System Status & Progress</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {AGENT_NAMES.map(name => (
                         <div key={name} className="bg-secondary p-4 rounded-xl flex flex-col justify-center min-h-[90px] border border-accent">
                            <AgentStatusIndicator name={name} status={agentStatus[name]} currentTask={agentWork[name]} />
                         </div>
                    ))}
                </div>
                 <div className="bg-secondary p-4 rounded-xl border border-accent">
                     <h3 className="font-semibold mb-2 text-light">Overall Progress ({completedTasksCount}/{totalTasksCount} tasks completed)</h3>
                     <div className="w-full bg-primary rounded-full h-4 overflow-hidden border border-accent relative">
                         <div 
                            className="absolute top-0 left-0 h-full bg-accent transition-all duration-500"
                            style={{width: `${overallProgress}%`}}
                            title={`Total work in progress: ${overallProgress.toFixed(0)}%`}
                            ></div>
                         <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-highlight to-violet-500 rounded-full transition-all duration-500" 
                            style={{width: `${completedProgress}%`}}
                            title={`Completed: ${completedProgress.toFixed(0)}%`}
                            ></div>
                     </div>
                 </div>
            </div>

            {pendingApprovals.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 text-highlight">3. Action Required: Approvals</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pendingApprovals.map(approval => (
                            <ApprovalCard key={approval.id} approval={approval} onDecision={onApproval} />
                        ))}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold mb-4 text-highlight">Task Board</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {AGENT_NAMES.map(agentName => {
                             if (agentName === AgentName.MASTER_PLANNER) return null;
                             return <TaskLane 
                                key={agentName} 
                                agentName={agentName} 
                                tasks={tasks.filter(t => t.assignedTo === agentName)} 
                                onCompleteTask={onCompleteTask} 
                                agentStatus={agentStatus}
                                onReassign={onReassignTask}
                             />
                        })}
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-4 text-highlight">Activity Feed</h2>
                    <AgentActivityFeed logs={logs} />
                </div>
            </div>
        </div>
    );
});