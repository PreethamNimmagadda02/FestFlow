import React, { useState, useEffect, useMemo } from 'react';
import { Task, AgentName, TaskStatus, FileAttachment } from '../types';
import { AGENT_DETAILS, MAX_TASK_RETRIES, TASK_STATUS_STYLES, AGENT_NAMES } from '../constants';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FileIcon } from './icons/FileIcon';
import { PencilIcon } from './icons/PencilIcon';

interface TaskDetailModalProps {
    task: Task;
    allTasks: Task[];
    onClose: () => void;
    onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = React.memo(({ task, allTasks, onClose, onTaskUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Task>(task);

    useEffect(() => {
        setEditedTask(task);
        if (!isEditing) { // Only reset if not in the middle of an edit
            setEditedTask(task);
        }
    }, [task]);

    const agentDetail = AGENT_DETAILS[editedTask.assignedTo];
    const isRetrying = editedTask.status === TaskStatus.IN_PROGRESS && (editedTask.retries || 0) > 0;
    const statusStyle = isRetrying ? TASK_STATUS_STYLES['Retrying'] : TASK_STATUS_STYLES[editedTask.status];
    const StatusIcon = statusStyle.icon;
    const AgentIcon = agentDetail.icon;
    const parentTask = editedTask.parentId ? allTasks.find(t => t.id === editedTask.parentId) : null;
    const subTasks = allTasks.filter(t => t.parentId === editedTask.id);

    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
    };

    const handleDependencyChange = (depId: string) => {
        const currentDeps = editedTask.dependsOn || [];
        const newDeps = currentDeps.includes(depId)
            ? currentDeps.filter(id => id !== depId)
            : [...currentDeps, depId];
        handleFieldChange('dependsOn', newDeps);
    };

    const handleSave = () => {
        const updates: Partial<Task> = {};
        if (task.title !== editedTask.title) updates.title = editedTask.title;
        if (task.description !== editedTask.description) updates.description = editedTask.description;
        if (task.assignedTo !== editedTask.assignedTo) updates.assignedTo = editedTask.assignedTo;

        const originalDeps = new Set(task.dependsOn || []);
        const editedDeps = new Set(editedTask.dependsOn || []);
        if (originalDeps.size !== editedDeps.size || ![...originalDeps].every(dep => editedDeps.has(dep))) {
            updates.dependsOn = editedTask.dependsOn;
        }

        if (Object.keys(updates).length > 0) {
            onTaskUpdate(task.id, updates);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedTask(task);
        setIsEditing(false);
    };
    
    const getDescendantIds = (parentId: string, tasks: Task[]): Set<string> => {
        const descendants = new Set<string>();
        const queue = tasks.filter(t => t.parentId === parentId).map(t => t.id);
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            descendants.add(currentId);
            const children = tasks.filter(t => t.parentId === currentId);
            children.forEach(c => queue.push(c.id));
        }
        return descendants;
    };
    
    const taskDescendants = useMemo(() => getDescendantIds(task.id, allTasks), [task.id, allTasks]);

    const circularDependencyCandidates = useMemo(() => {
        const descendants = new Set<string>();
        const queue: string[] = [task.id];
        const visited = new Set<string>([task.id]);

        const childrenMap = new Map<string, string[]>();
        allTasks.forEach(t => {
            (t.dependsOn || []).forEach(depId => {
                if (!childrenMap.has(depId)) childrenMap.set(depId, []);
                childrenMap.get(depId)!.push(t.id);
            });
        });

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = childrenMap.get(currentId) || [];
            for (const childId of children) {
                if (!visited.has(childId)) {
                    visited.add(childId);
                    descendants.add(childId);
                    queue.push(childId);
                }
            }
        }
        return descendants;
    }, [task.id, allTasks]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const newAttachment: FileAttachment = {
                id: `file-${Date.now()}`,
                name: file.name,
                type: file.type,
                size: file.size,
            };
            const updatedAttachments = [...(task.attachments || []), newAttachment];
            onTaskUpdate(task.id, { attachments: updatedAttachments });
        }
    };

    const handleRemoveAttachment = (fileId: string) => {
        const updatedAttachments = (task.attachments || []).filter(f => f.id !== fileId);
        onTaskUpdate(task.id, { attachments: updatedAttachments });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                onClick={e => e.stopPropagation()}
                style={{animationDuration: '0.3s'}}
            >
                <div className="p-4 border-b border-accent flex justify-between items-center flex-shrink-0">
                     {isEditing ? (
                        <input
                            type="text"
                            value={editedTask.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            className="text-lg font-bold text-highlight bg-primary border-2 border-accent rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-highlight"
                        />
                    ) : (
                        <h3 className="text-lg font-bold text-highlight truncate pr-4">{editedTask.title}</h3>
                    )}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="p-2 text-text-secondary hover:text-white rounded-full hover:bg-accent transition-colors" title="Edit Task">
                                <PencilIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-text-secondary hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Assigned To</h4>
                             {isEditing ? (
                                <select
                                    value={editedTask.assignedTo}
                                    onChange={(e) => handleFieldChange('assignedTo', e.target.value as AgentName)}
                                    className="w-full appearance-none bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light p-3 text-base"
                                >
                                    {AGENT_NAMES.filter(a => a !== AgentName.MASTER_PLANNER).map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="flex items-center space-x-2 bg-primary p-3 rounded-lg">
                                    <AgentIcon className={`w-5 h-5 ${agentDetail.color}`} />
                                    <span className="font-bold text-light">{editedTask.assignedTo}</span>
                                </div>
                            )}
                        </div>
                         <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Status</h4>
                            <div className={`inline-flex items-center text-sm font-semibold px-3 py-2.5 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                                <StatusIcon className="w-4 h-4 mr-2" />
                                {isRetrying ? `Retrying (${task.retries}/${MAX_TASK_RETRIES})` : task.status}
                            </div>
                        </div>
                    </div>
                    {parentTask && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Parent Task</h4>
                            <div className="bg-primary p-3 rounded-lg border border-accent text-light">{parentTask.title}</div>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Description</h4>
                         {isEditing ? (
                            <textarea
                                value={editedTask.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                className="w-full h-24 p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
                            />
                        ) : (
                            <p className="text-light whitespace-pre-wrap font-sans text-sm bg-primary p-3 rounded-lg border border-accent">{editedTask.description}</p>
                        )}
                    </div>

                    {isEditing ? (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Dependencies</h4>
                            <div className="space-y-2 bg-primary p-3 rounded-lg border border-accent max-h-48 overflow-y-auto">
                                {allTasks
                                    .filter(t => t.id !== task.id && !taskDescendants.has(t.id))
                                    .map(potentialDep => {
                                        const isCircular = circularDependencyCandidates.has(potentialDep.id);
                                        return (
                                            <label key={potentialDep.id} className={`flex items-center text-sm p-2 rounded-md transition-colors ${isCircular ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={(editedTask.dependsOn || []).includes(potentialDep.id)}
                                                    onChange={() => handleDependencyChange(potentialDep.id)}
                                                    disabled={isCircular}
                                                    className="h-4 w-4 rounded bg-secondary border-accent text-highlight focus:ring-highlight mr-3"
                                                />
                                                <span className={`${isCircular ? 'line-through' : 'text-light'} truncate`}>{potentialDep.title}</span>
                                                {isCircular && <span className="text-xs text-warning ml-auto flex-shrink-0">(Creates Cycle)</span>}
                                            </label>
                                        )
                                    })}
                                    {allTasks.filter(t => t.id !== task.id && !taskDescendants.has(t.id)).length === 0 && (
                                        <p className="text-text-secondary text-center text-xs py-2">No available tasks to set as dependencies.</p>
                                    )}
                            </div>
                        </div>
                    ) : (
                        task.dependsOn && task.dependsOn.length > 0 && (
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
                        )
                    )}

                     {subTasks.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Sub-Tasks</h4>
                            <ul className="space-y-2 bg-primary p-3 rounded-lg border border-accent">
                                {subTasks.map(subTask => {
                                    const isCompleted = subTask?.status === TaskStatus.COMPLETED;
                                    return (
                                        <li key={subTask.id} className={`flex items-center text-sm ${isCompleted ? 'text-light' : 'text-text-secondary'}`}>
                                             {isCompleted ? 
                                                <CheckCircleIcon className="w-4 h-4 mr-2 text-success flex-shrink-0" /> : 
                                                <ClockIcon className="w-4 h-4 mr-2 text-yellow-300 flex-shrink-0" />
                                            }
                                            <span className={isCompleted ? 'line-through' : ''}>{subTask.title}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                     <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-2">Attachments</h4>
                        <div className="bg-primary p-3 rounded-lg border border-accent space-y-3">
                            {(!task.attachments || task.attachments.length === 0) && (
                                <p className="text-text-secondary text-sm text-center py-2">No files attached.</p>
                            )}
                            <ul className="space-y-2">
                                {(task.attachments || []).map(file => (
                                    <li key={file.id} className="flex items-center justify-between bg-secondary p-2 rounded-md text-sm group">
                                        <div className="flex items-center space-x-3 truncate">
                                            <FileIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                                            <span className="text-light truncate">{file.name}</span>
                                            <span className="text-text-secondary flex-shrink-0">({formatBytes(file.size)})</span>
                                        </div>
                                        <button onClick={() => handleRemoveAttachment(file.id)} className="text-text-secondary hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                             <label className="w-full mt-2 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold cursor-pointer text-sm">
                                <PaperclipIcon className="w-4 h-4" />
                                <span>Add Attachment</span>
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-t border-accent text-right flex-shrink-0">
                    {isEditing ? (
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg bg-accent text-light hover:opacity-90 transition-opacity font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-opacity font-semibold"
                            >
                                Save Changes
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-highlight text-white hover:opacity-90 transition-opacity"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
