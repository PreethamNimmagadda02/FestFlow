import React, { useState, useMemo } from 'react';
import { Task, Approval, ActivityLog, AgentName, AgentStatus, TaskStatus } from '../types';
import { AGENT_NAMES, AGENT_DETAILS, AGENT_STATUS_STYLES } from '../constants';
import { TaskLane } from './TaskLane';
import { ApprovalCard } from './ApprovalCard';
import { AgentActivityFeed } from './AgentActivityFeed';
import { GanttChart } from './GanttChart';
import { PencilIcon } from './icons/PencilIcon';
import { SearchIcon } from './icons/SearchIcon';
import { FilterIcon } from './icons/FilterIcon';
import { XCircleIcon } from './icons/XCircleIcon';

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
                <div className="flex-shrink-0">
                    <h4 className="font-bold text-lg text-light tracking-wide">Project Completion</h4>
                    <p className="text-sm font-semibold text-highlight">{completedTasks} of {totalTasks} tasks complete</p>
                </div>
                
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
    onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
    onGanttSaveChanges: (orderedTasks: Task[]) => void;
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
    onViewResult,
    onTaskUpdate,
    onGanttSaveChanges
}) => {
    const [view, setView] = useState<'kanban' | 'gantt'>('kanban');
    const [isGanttEditing, setIsGanttEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAgent, setFilterAgent] = useState<AgentName | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

    const pendingApprovals = approvals.filter(a => a.status === 'pending');

    const filteredTasks = useMemo(() => {
        const lowercasedSearch = searchTerm.toLowerCase();
        
        const taskMap = new Map(tasks.map(t => [t.id, t]));

        const getParentChain = (taskId: string, chain: Set<string> = new Set()): Set<string> => {
            const task = taskMap.get(taskId);
            if (task?.parentId && !chain.has(task.parentId)) {
                chain.add(task.parentId);
                getParentChain(task.parentId, chain);
            }
            return chain;
        };

        const getSubTaskChain = (taskId: string, chain: Set<string> = new Set()): Set<string> => {
            const children = tasks.filter(t => t.parentId === taskId);
            children.forEach(child => {
                if (!chain.has(child.id)) {
                    chain.add(child.id);
                    getSubTaskChain(child.id, chain);
                }
            });
            return chain;
        };
        
        if (!searchTerm && filterAgent === 'all' && filterStatus === 'all') {
            return tasks;
        }

        const matchingTaskIds = new Set<string>();

        tasks.forEach(task => {
            const matchesAgent = filterAgent === 'all' || task.assignedTo === filterAgent;
            const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
            const matchesSearch = lowercasedSearch === '' || 
                                  task.title.toLowerCase().includes(lowercasedSearch) || 
                                  task.description.toLowerCase().includes(lowercasedSearch);

            if (matchesAgent && matchesStatus && matchesSearch) {
                matchingTaskIds.add(task.id);
                // Add parents and children to maintain context
                getParentChain(task.id).forEach(id => matchingTaskIds.add(id));
                getSubTaskChain(task.id).forEach(id => matchingTaskIds.add(id));
            }
        });
        
        return tasks.filter(task => matchingTaskIds.has(task.id));
    }, [tasks, searchTerm, filterAgent, filterStatus]);
    
    const showClearFilters = searchTerm || filterAgent !== 'all' || filterStatus !== 'all';

    const clearFilters = () => {
        setSearchTerm('');
        setFilterAgent('all');
        setFilterStatus('all');
    };

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

                 <div className="flex justify-between items-center mt-6">
                    <h3 className="text-lg font-bold text-light">Task Board</h3>
                    <div className="flex items-center space-x-2 bg-secondary p-1 rounded-lg border border-accent">
                        <button 
                            onClick={() => { setView('kanban'); setIsGanttEditing(false); }}
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

                <div className="bg-secondary p-3 mt-4 rounded-xl border border-accent flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search tasks by title or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light pl-10 pr-4 py-2"
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-52">
                             <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                             <select
                                value={filterAgent}
                                onChange={(e) => setFilterAgent(e.target.value as AgentName | 'all')}
                                className="w-full appearance-none bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light pl-9 pr-8 py-2 text-sm"
                            >
                                <option value="all">All Agents</option>
                                {AGENT_NAMES.filter(a => a !== AgentName.MASTER_PLANNER).map(agent => (
                                    <option key={agent} value={agent}>{agent}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative w-full md:w-52">
                            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
                                className="w-full appearance-none bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light pl-9 pr-8 py-2 text-sm"
                            >
                                <option value="all">All Statuses</option>
                                {Object.values(TaskStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        {showClearFilters && (
                           <button onClick={clearFilters} className="p-2 text-text-secondary hover:text-white" title="Clear filters">
                               <XCircleIcon className="w-5 h-5"/>
                           </button>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    {view === 'kanban' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {AGENT_NAMES.filter(name => name !== AgentName.MASTER_PLANNER).map(agentName => (
                                <TaskLane
                                    key={agentName}
                                    agentName={agentName}
                                    tasks={filteredTasks}
                                    allTasks={tasks}
                                    onCompleteTask={onCompleteTask}
                                    agentStatus={agentStatus}
                                    onReassign={onReassignTask}
                                    onTaskClick={onTaskClick}
                                    onViewResult={onViewResult}
                                />
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-end mb-4">
                                {view === 'gantt' && !isGanttEditing && tasks.length > 0 && (
                                    <button 
                                        onClick={() => setIsGanttEditing(true)}
                                        className="flex items-center space-x-2 rounded-lg border-2 border-accent px-3 py-1 text-sm font-semibold text-text-secondary transition-colors hover:bg-highlight hover:text-white hover:border-highlight"
                                        title="Edit Timeline"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        <span>Edit Timeline</span>
                                    </button>
                                )}
                            </div>
                            <GanttChart 
                                tasks={filteredTasks} 
                                onTaskClick={onTaskClick} 
                                onTaskUpdate={onTaskUpdate}
                                isEditing={isGanttEditing}
                                setIsEditing={setIsGanttEditing}
                                onSaveChanges={onGanttSaveChanges}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
