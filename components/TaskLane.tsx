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
    onTaskClick: (task: Task) => void;
    onViewResult: (task: Task) => void;
}

interface TaskCardProps {
    task: Task;
    allTasks: Task[];
    onComplete: (taskId:string) => void;
    agentStatus: Record<AgentName, AgentStatus>;
    onReassign: (taskId: string, newAgent: AgentName) => void;
    onCardClick: (task: Task) => void;
    onViewResult: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, allTasks, onComplete, agentStatus, onReassign, onCardClick, onViewResult }) => {
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
        <div 
            className={`group relative bg-primary p-4 rounded-xl shadow-lg border-l-4 ${isCompleted ? 'border-green-500/50' : agentBorderColor} flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-highlight/20 hover:scale-[1.03] cursor-pointer`}
            onClick={() => onCardClick(task)}
        >
            {/* Main Content */}
            <div className={`flex-grow space-y-2 ${isCompleted ? 'opacity-60 group-hover:opacity-100' : ''} transition-opacity`}>
                <h4 className={`font-bold text-lg ${isCompleted ? 'text-text-secondary' : 'text-light'}`}>{task.title}</h4>
                <p className="text-sm text-text-secondary truncate">{task.description}</p>
            </div>
            
            {/* Dependencies Section */}
            {task.dependsOn && task.dependsOn.length > 0 && (
                <div className="mt-3 pt-3 border-t border-accent/50">
                    <h5 className="text-xs font-semibold text-text-secondary mb-2">Prerequisites</h5>
                    <ul className="space-y-1.5">
                        {task.dependsOn.map(depId => {
                            const depTask = allTasks.find(t => t.id === depId);
                            if (!depTask) return null;
                            const isCompleted = depTask.status === TaskStatus.COMPLETED;
                            return (
                                <li key={depId} className={`flex items-center text-xs ${isCompleted ? 'text-gray-500' : 'text-gray-300'}`}>
                                    {isCompleted ? 
                                        <CheckCircleIcon className="w-3.5 h-3.5 mr-1.5 text-success flex-shrink-0" /> : 
                                        <ClockIcon className="w-3.5 h-3.5 mr-1.5 text-yellow-400 flex-shrink-0" />
                                    }
                                    <span className={`${isCompleted ? 'line-through' : ''} truncate`} title={depTask.title}>
                                        {depTask.title}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            
            {/* Footer with Status and Actions */}
            <div className="pt-3 space-y-3">
                 <div className="flex justify-between items-center">
                    <div className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1.5" />
                        {isRetrying ? `Retrying (${task.retries}/${MAX_TASK_RETRIES})` : task.status}
                    </div>
                     {task.estimatedDuration && !isCompleted && (
                        <div className="text-xs text-text-secondary flex items-center" title={`Estimated Duration: ${task.estimatedDuration} day(s)`}>
                            <ClockIcon className="w-3.5 h-3.5 mr-1" />
                            <span>{task.estimatedDuration} day{task.estimatedDuration > 1 ? 's' : ''}</span>
                        </div>
                    )}
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
                        onClick={(e) => handleButtonClick(e, () => onViewResult(task))}
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
    );
});


export const TaskLane: React.FC<TaskLaneProps> = React.memo(({ agentName, tasks, onCompleteTask, agentStatus, onReassign, onTaskClick, onViewResult }) => {
    const agentDetail = AGENT_DETAILS[agentName];
    const Icon = agentDetail.icon;
    
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
                        allTasks={tasks}
                        onComplete={onCompleteTask}
                        agentStatus={agentStatus}
                        onReassign={onReassign}
                        onCardClick={onTaskClick}
                        onViewResult={onViewResult}
                    />)
                )}
            </div>
        </div>
    );
});
