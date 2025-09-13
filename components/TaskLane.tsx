import React, { useState } from 'react';
import { Task, AgentName, TaskStatus, AgentStatus } from '../types';
import { AGENT_DETAILS, TASK_STATUS_STYLES, MAX_TASK_RETRIES, AGENT_NAMES } from '../constants';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';

// Tailwind JIT scanning hints. These classes are constructed dynamically.
// border-cyan-400 bg-cyan-400
// border-orange-400 bg-orange-400
// border-green-400 bg-green-400
// border-purple-400 bg-purple-400

interface TaskLaneProps {
    agentName: AgentName;
    tasks: Task[];
    onCompleteTask: (taskId: string) => void;
    agentStatus: Record<AgentName, AgentStatus>;
    onReassign: (taskId: string, newAgent: AgentName) => void;
}

interface TaskCardProps {
    task: Task;
    onComplete: (taskId:string) => void;
    agentStatus: Record<AgentName, AgentStatus>;
    onReassign: (taskId: string, newAgent: AgentName) => void;
    onCardClick: (task: Task) => void;
}

const ResultModal: React.FC<{ task: Task; onClose: () => void }> = React.memo(({ task, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                onClick={e => e.stopPropagation()}
                style={{animationDuration: '0.3s'}}
            >
                <div className="p-4 border-b border-accent flex justify-between items-center">
                    <h3 className="text-lg font-bold text-highlight">Result: {task.title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                     <pre className="text-text-secondary whitespace-pre-wrap font-sans text-sm bg-primary p-4 rounded-lg border border-accent">{task.approvedContent}</pre>
                </div>
                 <div className="p-4 border-t border-accent text-right">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-highlight text-white hover:opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
});

const TaskDetailModal: React.FC<{ task: Task; allTasks: Task[]; onClose: () => void }> = React.memo(({ task, allTasks, onClose }) => {
    const agentDetail = AGENT_DETAILS[task.assignedTo];
    const isRetrying = task.status === TaskStatus.IN_PROGRESS && (task.retries || 0) > 0;
    const statusStyle = isRetrying ? TASK_STATUS_STYLES['Retrying'] : TASK_STATUS_STYLES[task.status];
    const StatusIcon = statusStyle.icon;
    const AgentIcon = agentDetail.icon;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                onClick={e => e.stopPropagation()}
                style={{animationDuration: '0.3s'}}
            >
                <div className="p-4 border-b border-accent flex justify-between items-center">
                    <h3 className="text-lg font-bold text-highlight">{task.title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Assigned To</h4>
                        <div className="flex items-center space-x-2 bg-primary p-2 rounded-lg">
                             <AgentIcon className={`w-5 h-5 ${agentDetail.color}`} />
                             <span className="font-bold text-light">{task.assignedTo}</span>
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Status</h4>
                        <div className={`inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                            <StatusIcon className="w-4 h-4 mr-2" />
                            {isRetrying ? `Retrying (${task.retries}/${MAX_TASK_RETRIES})` : task.status}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Description</h4>
                        <p className="text-light whitespace-pre-wrap font-sans text-sm bg-primary p-3 rounded-lg border border-accent">{task.description}</p>
                    </div>

                    {task.dependsOn && task.dependsOn.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Dependencies</h4>
                            <ul className="space-y-2 bg-primary p-3 rounded-lg border border-accent">
                                {task.dependsOn.map(depId => {
                                    const depTask = allTasks.find(t => t.id === depId);
                                    const isCompleted = depTask?.status === TaskStatus.COMPLETED;
                                    return (
                                        <li key={depId} className={`flex items-center text-sm ${isCompleted ? 'text-light' : 'text-text-secondary'}`}>
                                            {isCompleted ? 
                                                <CheckCircleIcon className="w-4 h-4 mr-2 text-success flex-shrink-0" /> : 
                                                <ClockIcon className="w-4 h-4 mr-2 text-yellow-300 flex-shrink-0" />
                                            }
                                            <span className={isCompleted ? 'line-through' : ''}>
                                                {depTask ? depTask.title : 'Unknown Task'}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>
                 <div className="p-4 border-t border-accent text-right">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-highlight text-white hover:opacity-90 transition-opacity"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
});


const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, onComplete, agentStatus, onReassign, onCardClick }) => {
    const [isResultVisible, setIsResultVisible] = useState(false);
    const [showReassignOptions, setShowReassignOptions] = useState(false);

    const isRetrying = task.status === TaskStatus.IN_PROGRESS && (task.retries || 0) > 0;
    const statusStyle = isRetrying ? TASK_STATUS_STYLES['Retrying'] : TASK_STATUS_STYLES[task.status];
    const StatusIcon = statusStyle.icon;
    const progress = task.progress ?? 0;
    
    const isManuallyCompletable = task.assignedTo === AgentName.LOGISTICS_COORDINATOR 
        && task.status === TaskStatus.IN_PROGRESS 
        && progress >= 100;

    const hasApprovedContent = task.status === TaskStatus.COMPLETED && task.approvedContent;
    const isFailed = task.status === TaskStatus.FAILED;
    const isCompleted = task.status === TaskStatus.COMPLETED;

    const availableAgentsForReassignment = AGENT_NAMES.filter(name => 
        name !== AgentName.MASTER_PLANNER &&
        name !== task.assignedTo &&
        agentStatus[name] === AgentStatus.IDLE
    );
    
    const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    const agentColor = AGENT_DETAILS[task.assignedTo].color;
    const agentBorderColor = agentColor.replace('text-', 'border-');
    const agentBgColor = agentColor.replace('text-', 'bg-');

    return (
        <>
            <div 
                className={`group relative bg-primary p-4 rounded-xl shadow-lg border-l-4 ${isCompleted ? 'border-green-500/50' : agentBorderColor} flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-highlight/20 hover:scale-[1.03] cursor-pointer`}
                onClick={() => onCardClick(task)}
            >
                {/* Main Content */}
                <div className={`flex-grow space-y-2 pb-2 ${isCompleted ? 'opacity-60 group-hover:opacity-100' : ''} transition-opacity`}>
                    <h4 className={`font-bold text-lg ${isCompleted ? 'text-text-secondary' : 'text-light'}`}>{task.title}</h4>
                    <p className="text-sm text-text-secondary truncate">{task.description}</p>
                </div>
                
                {/* Footer with Status and Actions */}
                <div className="pt-2 space-y-3">
                     <div className="flex justify-between items-center">
                        <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />
                            {isRetrying ? `Retrying (${task.retries}/${MAX_TASK_RETRIES})` : task.status}
                        </div>
                    </div>

                    {isManuallyCompletable && (
                         <button
                            onClick={(e) => handleButtonClick(e, () => onComplete(task.id))}
                            className="w-full bg-success text-white font-bold py-2 px-3 rounded-lg hover:bg-success/90 transition-colors text-sm"
                        >
                            Mark as Complete
                        </button>
                    )}
                    {hasApprovedContent && (
                        <button
                            onClick={(e) => handleButtonClick(e, () => setIsResultVisible(true))}
                            className="w-full bg-info text-white font-bold py-2 px-3 rounded-lg hover:bg-info/90 transition-colors text-sm"
                        >
                            View Result
                        </button>
                    )}
                    {isFailed && (
                        <div className="relative">
                            <button
                                onClick={(e) => handleButtonClick(e, () => setShowReassignOptions(!showReassignOptions))}
                                disabled={availableAgentsForReassignment.length === 0}
                                className="w-full bg-warning text-white font-bold py-2 px-3 rounded-lg hover:bg-warning/90 transition-colors text-sm disabled:bg-accent disabled:cursor-not-allowed"
                            >
                                {availableAgentsForReassignment.length > 0 ? 'Reassign Task' : 'No Agents Available'}
                            </button>
                            {showReassignOptions && availableAgentsForReassignment.length > 0 && (
                                <div className="absolute bottom-full mb-2 w-full p-2 bg-accent rounded-md border border-primary space-y-2 z-10 animate-fadeIn" style={{animationDuration: '0.2s'}}>
                                    <p className="text-xs text-text-secondary px-1">Reassign to:</p>
                                    {availableAgentsForReassignment.map(agent => (
                                        <button
                                            key={agent}
                                            onClick={(e) => handleButtonClick(e, () => {
                                                onReassign(task.id, agent);
                                                setShowReassignOptions(false);
                                            })}
                                            className="w-full text-left text-sm p-2 rounded-md hover:bg-highlight/50 transition-colors text-light"
                                        >
                                            {agent}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                 {/* Progress Bar */}
                 {(task.status === TaskStatus.IN_PROGRESS && progress > 0) && (
                    <div className="w-full bg-accent rounded-full h-1 mt-3">
                        <div
                            className={`${agentBgColor} h-1 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
            {isResultVisible && hasApprovedContent && <ResultModal task={task} onClose={() => setIsResultVisible(false)} />}
        </>
    );
});


export const TaskLane: React.FC<TaskLaneProps> = React.memo(({ agentName, tasks, onCompleteTask, agentStatus, onReassign }) => {
    const agentDetail = AGENT_DETAILS[agentName];
    const Icon = agentDetail.icon;
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    const tasksForLane = tasks.filter(t => t.assignedTo === agentName);

    return (
        <div className="bg-secondary p-4 rounded-xl flex flex-col h-full border border-accent">
            <div className="flex items-center space-x-3 mb-4 p-2 border-b border-accent">
                <Icon className={`w-6 h-6 ${agentDetail.color}`} />
                <h3 className="font-bold text-lg text-light">{agentName}</h3>
            </div>
            <div className="space-y-4 overflow-y-auto flex-grow pr-1 -mr-2">
                 {tasksForLane.length === 0 ? (
                    <p className="text-text-secondary text-sm p-4 text-center">No tasks assigned.</p>
                ) : (
                    tasksForLane.map(task => <TaskCard 
                        key={task.id} 
                        task={task} 
                        onComplete={onCompleteTask}
                        agentStatus={agentStatus}
                        onReassign={onReassign}
                        onCardClick={setSelectedTask}
                    />)
                )}
            </div>
            {selectedTask && <TaskDetailModal task={selectedTask} allTasks={tasks} onClose={() => setSelectedTask(null)} />}
        </div>
    );
});