import React, { useState } from 'react';
import { Task, AgentName, TaskStatus, AgentStatus } from '../types';
import { AGENT_DETAILS, TASK_STATUS_STYLES, MAX_TASK_RETRIES, AGENT_NAMES } from '../constants';

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

const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = React.memo(({ task, onClose }) => {
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

    const availableAgentsForReassignment = AGENT_NAMES.filter(name => 
        name !== AgentName.MASTER_PLANNER &&
        name !== task.assignedTo &&
        agentStatus[name] === AgentStatus.IDLE
    );
    
    const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <>
            <div 
                className="bg-primary p-4 rounded-xl shadow-lg border-l-4 border-highlight space-y-3 animate-fadeIn flex flex-col justify-between transition-transform hover:scale-[1.02] cursor-pointer"
                onClick={() => onCardClick(task)}
            >
                <div>
                    <h4 className="font-bold text-lg text-highlight mb-1">{task.title}</h4>
                    <p className="text-sm text-text-secondary truncate">{task.description}</p>
                </div>
                
                <div className="pt-2">
                    <div className="flex items-center space-x-2">
                        <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />
                            {isRetrying ? `Retrying (${task.retries}/${MAX_TASK_RETRIES})` : task.status}
                        </div>
                    </div>
                    {isManuallyCompletable && (
                         <button
                            onClick={(e) => handleButtonClick(e, () => onComplete(task.id))}
                            className="w-full mt-3 bg-success text-white font-bold py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
                        >
                            Mark as Complete
                        </button>
                    )}
                    {hasApprovedContent && (
                        <button
                            onClick={(e) => handleButtonClick(e, () => setIsResultVisible(true))}
                            className="w-full mt-3 bg-info text-white font-bold py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
                        >
                            View Result
                        </button>
                    )}
                    {isFailed && (
                        <div className="mt-3">
                            <button
                                onClick={(e) => handleButtonClick(e, () => setShowReassignOptions(!showReassignOptions))}
                                disabled={availableAgentsForReassignment.length === 0}
                                className="w-full bg-warning text-white font-bold py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:bg-accent disabled:cursor-not-allowed"
                            >
                                {availableAgentsForReassignment.length > 0 ? 'Reassign Task' : 'No Agents Available'}
                            </button>
                            {showReassignOptions && availableAgentsForReassignment.length > 0 && (
                                <div className="mt-2 p-2 bg-primary rounded-md border border-accent space-y-2">
                                    <p className="text-xs text-text-secondary">Reassign to:</p>
                                    {availableAgentsForReassignment.map(agent => (
                                        <button
                                            key={agent}
                                            onClick={(e) => handleButtonClick(e, () => {
                                                onReassign(task.id, agent);
                                                setShowReassignOptions(false);
                                            })}
                                            className="w-full text-left text-sm p-2 rounded-md hover:bg-accent transition-colors"
                                        >
                                            {agent}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {isResultVisible && hasApprovedContent && <ResultModal task={task} onClose={() => setIsResultVisible(false)} />}
        </>
    );
});


export const TaskLane: React.FC<TaskLaneProps> = React.memo(({ agentName, tasks, onCompleteTask, agentStatus, onReassign }) => {
    const agentDetail = AGENT_DETAILS[agentName];
    const Icon = agentDetail.icon;
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    return (
        <div className="bg-secondary p-4 rounded-xl flex flex-col h-full border border-accent">
            <div className="flex items-center space-x-3 mb-4 p-2 border-b border-accent">
                <Icon className={`w-6 h-6 ${agentDetail.color}`} />
                <h3 className="font-bold text-lg text-light">{agentName}</h3>
            </div>
            <div className="space-y-4 overflow-y-auto flex-grow pr-1 -mr-2">
                 {tasks.length === 0 ? (
                    <p className="text-text-secondary text-sm p-4 text-center">No tasks assigned.</p>
                ) : (
                    tasks.map(task => <TaskCard 
                        key={task.id} 
                        task={task} 
                        onComplete={onCompleteTask}
                        agentStatus={agentStatus}
                        onReassign={onReassign}
                        onCardClick={setSelectedTask}
                    />)
                )}
            </div>
            {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
        </div>
    );
});