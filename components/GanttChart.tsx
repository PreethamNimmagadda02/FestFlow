import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import { AGENT_DETAILS } from '../constants';
import { UndoIcon } from './icons/UndoIcon';

// A simple date utility library to avoid external dependencies
const dateUtils = {
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  getDaysBetween: (startDate: Date, endDate: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000;
    // We want the number of days inclusive. e.g., Jan 1 to Jan 2 is 2 days.
    // We also need to account for timezone offsets by using UTC dates for calculation
    const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    const end = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));
    return Math.round((end.getTime() - start.getTime()) / oneDay) + 1;
  },
};

interface GanttChartProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
    isEditing: boolean;
    setIsEditing: (isEditing: boolean) => void;
    onSaveChanges: (orderedTasks: Task[]) => void;
}

interface GanttTask extends Task {
    ganttStartDate: Date;
    ganttEndDate: Date;
}

const calculateTaskDates = (tasks: Task[], projectStartDate: Date): GanttTask[] => {
    const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
    const ganttTaskMap = new Map<string, GanttTask>();

    // Build a map of what tasks depend on each task (children)
    const childrenMap = new Map<string, string[]>();
    tasks.forEach(task => {
        childrenMap.set(task.id, []);
    });
    tasks.forEach(task => {
        (task.dependsOn || []).forEach(depId => {
            if (childrenMap.has(depId)) {
                childrenMap.get(depId)!.push(task.id);
            }
        });
    });

    // Calculate the in-degree (number of unmet dependencies) for each task
    const inDegree = new Map<string, number>();
    tasks.forEach(task => {
        const validDependencies = (task.dependsOn || []).filter(depId => taskMap.has(depId));
        inDegree.set(task.id, validDependencies.length);
    });

    // Initialize a queue with tasks that can be scheduled immediately.
    // These are tasks with no dependencies OR tasks with a fixed start date.
    const queue: string[] = [];
    tasks.forEach(task => {
        if (task.startDate || inDegree.get(task.id) === 0) {
            queue.push(task.id);
        }
    });

    let processedCount = 0;
    while (queue.length > 0) {
        const taskId = queue.shift()!;
        
        // A task might be processed early due to a fixed start date, so skip if already done.
        if (ganttTaskMap.has(taskId)) continue;

        const task = taskMap.get(taskId)!;
        
        let ganttStartDate: Date;
        // A fixed start date always takes precedence
        if (task.startDate) {
            ganttStartDate = new Date(task.startDate);
        } else if (task.dependsOn && task.dependsOn.length > 0) {
            const parentEndDates = task.dependsOn
                .map(depId => ganttTaskMap.get(depId)?.ganttEndDate)
                .filter((d): d is Date => !!d); // Filter out any undefined dates

            if (parentEndDates.length > 0) {
                const maxParentEndDate = new Date(Math.max(...parentEndDates.map(d => d.getTime())));
                ganttStartDate = dateUtils.addDays(maxParentEndDate, 1);
            } else {
                ganttStartDate = projectStartDate;
            }
        } else {
            ganttStartDate = projectStartDate;
        }

        const duration = Math.max(1, task.estimatedDuration || 1);
        const ganttEndDate = dateUtils.addDays(ganttStartDate, duration - 1);

        ganttTaskMap.set(taskId, { ...task, ganttStartDate, ganttEndDate });
        processedCount++;

        // For each child of the processed task, decrement their dependency count.
        // If a child's dependency count reaches zero, it's ready to be processed.
        const children = childrenMap.get(taskId) || [];
        for (const childId of children) {
            const currentInDegree = inDegree.get(childId)!;
            inDegree.set(childId, currentInDegree - 1);
            
            // If the child has no more unmet dependencies and doesn't have a fixed start date, add it to the queue.
            if (inDegree.get(childId) === 0 && !taskMap.get(childId)?.startDate) {
                queue.push(childId);
            }
        }
    }

    // Handle circular dependencies: any task not processed is part of a cycle.
    // Assign them a fallback date to prevent the app from crashing and make the cycle visible.
    if (processedCount < tasks.length) {
        console.warn("Circular dependency detected. Assigning fallback dates to un-processed tasks.");
        tasks.forEach(task => {
            if (!ganttTaskMap.has(task.id)) {
                console.warn(`- Task in cycle: ${task.title} (${task.id})`);
                const ganttStartDate = task.startDate ? new Date(task.startDate) : projectStartDate; // Fallback date
                const duration = Math.max(1, task.estimatedDuration || 1);
                const ganttEndDate = dateUtils.addDays(ganttStartDate, duration - 1);
                ganttTaskMap.set(task.id, { ...task, ganttStartDate, ganttEndDate });
            }
        });
    }

    // Return the calculated tasks in the original order for rendering.
    return tasks.map(task => ganttTaskMap.get(task.id)!).filter(Boolean);
};


export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick, onTaskUpdate, isEditing, setIsEditing, onSaveChanges }) => {
    const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
    const [history, setHistory] = useState<Task[][]>([]);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ index: number; y: number } | null>(null);
    const ganttGridRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [dragOffsetX, setDragOffsetX] = useState(0);
    const [tooltip, setTooltip] = useState<{
        content: {
            prerequisites: string[];
            startDay: number;
            endDay: number;
            duration: number;
        };
        position: {
            top: number;
            left: number;
            width: number;
        }
    } | null>(null);

    useEffect(() => {
        // When the parent tasks change, reset local state and history
        setOrderedTasks(tasks);
        setHistory([]);
    }, [tasks]);

    const { ganttTasks, chartStartDate, totalDays, projectStartDate } = useMemo(() => {
        if (tasks.length === 0) { // Base calculation on original tasks to avoid flicker during edits
            const today = new Date();
            today.setHours(0,0,0,0);
            return {
                ganttTasks: [], chartStartDate: today,
                totalDays: 35, projectStartDate: today,
            };
        }
        
        const allStartDates = tasks.map(t => new Date(t.startDate || new Date()));
        const earliestDate = allStartDates.length > 0 ? new Date(Math.min(...allStartDates.map(d => d.getTime()))) : new Date();
        earliestDate.setHours(0,0,0,0);

        const calculatedGanttTasks = calculateTaskDates(orderedTasks, earliestDate);
        
        const startDates = calculatedGanttTasks.map(t => t.ganttStartDate);
        const endDates = calculatedGanttTasks.map(t => t.ganttEndDate);

        const projectStartDate = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : earliestDate;
        const maxDate = endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : earliestDate;
        
        const chartStartDate = projectStartDate;
        const chartEndDate = dateUtils.addDays(maxDate, 7);
        const totalDays = Math.max(35, dateUtils.getDaysBetween(chartStartDate, chartEndDate));
        
        return { ganttTasks: calculatedGanttTasks, chartStartDate, totalDays, projectStartDate };
    }, [orderedTasks, tasks]);

    const timelineDates: Date[] = useMemo(() => {
        return Array.from({ length: totalDays }, (_, i) => dateUtils.addDays(chartStartDate, i));
    }, [chartStartDate, totalDays]);

    const ganttTasksMap = useMemo(() => new Map(ganttTasks.map(gt => [gt.id, gt])), [ganttTasks]);
    
    // --- State Update and History Management ---

    const updateTasksAndStoreHistory = (updateFn: (currentTasks: Task[]) => Task[]) => {
        setOrderedTasks(currentTasks => {
            setHistory(prevHistory => [...prevHistory, currentTasks]); // Store the state *before* the update
            return updateFn(currentTasks); // Return the new state
        });
    };
    
    const handleUndo = () => {
        if (history.length > 0) {
            const lastState = history[history.length - 1];
            setOrderedTasks(lastState);
            setHistory(prevHistory => prevHistory.slice(0, -1));
        }
    };
    
    const getAllPrerequisites = (taskId: string, allTasks: Task[]): string[] => {
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const prerequisites = new Set<string>();
        const visitedInThisTraversal = new Set<string>();

        const startTask = taskMap.get(taskId);
        if (!startTask) return [];

        const processingQueue = [...(startTask.dependsOn || [])];
        
        while(processingQueue.length > 0) {
            const currentDepId = processingQueue.shift()!;
            
            if (visitedInThisTraversal.has(currentDepId)) continue;
            visitedInThisTraversal.add(currentDepId);

            const depTask = taskMap.get(currentDepId);
            if (depTask) {
                prerequisites.add(depTask.title);
                if (depTask.dependsOn) {
                    processingQueue.push(...depTask.dependsOn);
                }
            }
        }

        return Array.from(prerequisites);
    };

    const getAllPrerequisiteIds = (taskId: string, allTasks: Task[]): Set<string> => {
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const prerequisiteIds = new Set<string>();
        const processingQueue: string[] = [taskId];
        const visitedForQueue = new Set<string>(); // To avoid adding same task to queue multiple times

        while (processingQueue.length > 0) {
            const currentTaskId = processingQueue.shift()!;
            const task = taskMap.get(currentTaskId);

            if (task?.dependsOn) {
                for (const depId of task.dependsOn) {
                    if (!prerequisiteIds.has(depId)) {
                        prerequisiteIds.add(depId);
                        if (!visitedForQueue.has(depId)) {
                            processingQueue.push(depId);
                            visitedForQueue.add(depId);
                        }
                    }
                }
            }
        }
        return prerequisiteIds;
    };


    // --- Drag and Drop Handlers ---
    
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        if (!isEditing) return;
        setDraggingTaskId(task.id);
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';

        const taskElement = e.currentTarget as HTMLDivElement;
        const taskRect = taskElement.getBoundingClientRect();
        const offsetX = e.clientX - taskRect.left;
        setDragOffsetX(offsetX);
    };

    const handleDragEnd = () => {
        setDraggingTaskId(null);
        setDropIndicator(null);
    };

    const handleSaveChangesClick = () => {
        onSaveChanges(orderedTasks);
        setIsEditing(false);
        setHistory([]);
    };

    const handleCancelChanges = () => {
        setOrderedTasks(tasks); // Revert to original order
        setIsEditing(false);
        setHistory([]);
    };

    const hasPath = (fromId: string, toId: string, tasks: Task[]): boolean => {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const visited = new Set<string>();
        const queue = [fromId];
    
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            // Note: We check if any dependency path leads to toId, not just direct dependency.
            const currentTask = taskMap.get(currentId);
            if (currentTask && currentTask.dependsOn) {
                for (const depId of currentTask.dependsOn) {
                    if (depId === toId) return true;
                    if (!visited.has(depId)) {
                        visited.add(depId);
                        queue.push(depId);
                    }
                }
            }
        }
        return false;
    };

    const handleTaskBarDrop = (e: React.DragEvent, targetTask: Task) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedTaskId = e.dataTransfer.getData('taskId');
        if (!isEditing || !draggedTaskId || draggedTaskId === targetTask.id) return;
    
        updateTasksAndStoreHistory(currentTasks => {
            const pathExists = hasPath(targetTask.id, draggedTaskId, currentTasks);
    
            if (pathExists) {
                // Smart Refactoring: An indirect dependency exists (target -> ... -> dragged).
                // This action means "make the dragged task parallel to the target task".
                // We achieve this by making the target task depend on the dragged task's dependencies.
                const draggedDependencies = currentTasks.find(t => t.id === draggedTaskId)?.dependsOn || [];
                
                return currentTasks.map(task => {
                    if (task.id === targetTask.id) {
                        return { ...task, dependsOn: draggedDependencies, startDate: undefined };
                    }
                    return task;
                });
    
            } else {
                // Standard Dependency Creation: Make dragged task dependent on target task.
                const newTasks = [...currentTasks];
                const draggedTaskIndex = newTasks.findIndex(t => t.id === draggedTaskId);
    
                if (draggedTaskIndex === -1) return currentTasks;
    
                // Make dragged task (A) dependent on target task (B)
                const draggedTask = { ...newTasks[draggedTaskIndex] };
                draggedTask.dependsOn = Array.from(new Set([...(draggedTask.dependsOn || []), targetTask.id]));
                draggedTask.startDate = undefined; // Let date be recalculated
                newTasks[draggedTaskIndex] = draggedTask;
                
                // Auto-resolve direct circular dependency: if target (B) previously depended on dragged (A), remove that link.
                const targetTaskIndex = newTasks.findIndex(t => t.id === targetTask.id);
                if (targetTaskIndex !== -1) {
                    const newTargetTask = { ...newTasks[targetTaskIndex] };
                    if (newTargetTask.dependsOn?.includes(draggedTaskId)) {
                        newTargetTask.dependsOn = newTargetTask.dependsOn.filter(id => id !== draggedTaskId);
                        newTasks[targetTaskIndex] = newTargetTask;
                    }
                }
    
                return newTasks;
            }
        });
    };

    const handleGridDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedTaskId = e.dataTransfer.getData('taskId');

        if (!isEditing || !draggedTaskId || !ganttGridRef.current) return;

        const gridRect = ganttGridRef.current.getBoundingClientRect();
        const dropX = e.clientX - gridRect.left + ganttGridRef.current.scrollLeft;
        
        const adjustedDropX = dropX - dragOffsetX;
        
        const dayWidth = 64; // 4rem width per day
        
        const dayIndex = Math.round(adjustedDropX / dayWidth);
        const newStartDate = dateUtils.addDays(chartStartDate, dayIndex);
        
        updateTasksAndStoreHistory(currentTasks => 
            currentTasks.map(task => {
                if (task.id === draggedTaskId) {
                    const newDependsOn = task.dependsOn?.filter(depId => {
                         const depGanttTask = ganttTasksMap.get(depId);
                         return depGanttTask && depGanttTask.ganttEndDate < newStartDate;
                    });
                    return { ...task, startDate: newStartDate.toISOString().split('T')[0], dependsOn: newDependsOn };
                }
                return task;
            })
        );
    };

    const handleSidebarDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const draggedTaskId = e.dataTransfer.getData('taskId');
        if (!isEditing || !draggedTaskId || !dropIndicator) return;
        
        updateTasksAndStoreHistory(currentTasks => {
            const draggedTaskIndex = currentTasks.findIndex(t => t.id === draggedTaskId);
            if (draggedTaskIndex === -1) return currentTasks;
    
            const reorderedTasks = [...currentTasks];
            const [removed] = reorderedTasks.splice(draggedTaskIndex, 1);
            reorderedTasks.splice(dropIndicator.index, 0, removed);
            
            return reorderedTasks.map((task, newIndex) => {
                if (!task.dependsOn || task.dependsOn.length === 0) {
                    return task;
                }
    
                const validDependencies = task.dependsOn.filter(depId => {
                    const prerequisiteIndex = reorderedTasks.findIndex(t => t.id === depId);
                    return prerequisiteIndex !== -1 && prerequisiteIndex < newIndex;
                });
    
                if (validDependencies.length !== task.dependsOn.length) {
                    return { ...task, dependsOn: validDependencies };
                }
    
                return task;
            });
        });
        setDropIndicator(null);
    };

    const handleSidebarDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isEditing || !sidebarRef.current) return;
        
        const sidebarRect = sidebarRef.current.getBoundingClientRect();
        const offsetY = e.clientY - sidebarRect.top;
        const dropIndex = Math.max(0, Math.min(orderedTasks.length, Math.round(offsetY / 48)));
        const yPos = dropIndex * 48;
        
        setDropIndicator({ index: dropIndex, y: yPos });
    };

    const relatedTaskIds = useMemo(() => {
        if (!isEditing || !hoveredTaskId) {
            return new Set();
        }

        const allPrereqIds = getAllPrerequisiteIds(hoveredTaskId, orderedTasks);
        allPrereqIds.add(hoveredTaskId); // The hovered task itself should not be dimmed

        return allPrereqIds;
    }, [isEditing, hoveredTaskId, orderedTasks]);


    if (tasks.length === 0) {
        return (
            <div className="bg-secondary p-6 rounded-xl border border-accent text-center text-text-secondary h-64 flex items-center justify-center">
                No tasks to display in the timeline.
            </div>
        );
    }
    
    return (
        <div className="bg-secondary rounded-xl border border-accent overflow-hidden shadow-2xl">
            {isEditing && (
                 <div className="p-3 bg-primary/50 border-b border-accent flex justify-between items-center animate-fadeIn sticky top-0 z-30">
                    <div>
                        <h4 className="font-bold text-highlight">Edit Mode</h4>
                        <p className="text-sm text-text-secondary">Drag a task bar to reschedule, reorder, or create dependencies.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <UndoIcon className="w-4 h-4" />
                            <span>Undo</span>
                        </button>
                        <button 
                            onClick={handleCancelChanges}
                            className="px-4 py-2 rounded-lg bg-accent text-light hover:bg-accent/80 transition-opacity font-semibold"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveChangesClick}
                            className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/90 transition-opacity font-semibold"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
            <div className="flex text-sm" style={{ minWidth: `${256 + totalDays * 64}px`}}>
                <div 
                    ref={sidebarRef}
                    className="w-64 border-r border-accent font-semibold flex-shrink-0 relative"
                    onDrop={handleSidebarDrop}
                    onDragOver={handleSidebarDragOver}
                    onDragLeave={() => setDropIndicator(null)}
                >
                    <div className="h-16 border-b border-accent flex items-center p-4 text-light bg-primary/30 sticky top-0 z-20">Task Name</div>
                    <div className="divide-y divide-accent">
                        {orderedTasks.map(task => (
                            <div 
                                key={task.id} 
                                className={`h-12 p-4 flex items-center truncate transition-opacity ${draggingTaskId === task.id ? 'opacity-30' : ''}`}
                                title={task.title}
                            >
                                <span className="truncate text-light">{task.title}</span>
                            </div>
                        ))}
                    </div>
                    {isEditing && dropIndicator && (
                         <div className="absolute left-0 right-0 h-1 bg-highlight/70 rounded-full transition-all duration-100" style={{ transform: `translateY(${dropIndicator.y}px)`}} />
                    )}
                </div>

                <div ref={ganttGridRef} className="flex-grow overflow-x-auto" onDrop={handleGridDrop} onDragOver={(e) => e.preventDefault()}>
                    <div className="sticky top-0 z-10 bg-secondary">
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 4rem)` }}>
                            {timelineDates.map((date, index) => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const relativeDay = dateUtils.getDaysBetween(projectStartDate, date);
                                return (
                                <div key={index} className={`h-16 border-b border-r border-accent flex flex-col items-center justify-center ${isWeekend ? 'bg-primary/20' : ''}`}>
                                    <span className="text-xs text-text-secondary">Day</span>
                                    <span className="font-bold text-lg text-light">{relativeDay}</span>
                                </div>
                            )})}
                        </div>
                    </div>
                     <div className="relative divide-y divide-accent">
                        {orderedTasks.map((task) => {
                            const ganttTask = ganttTasksMap.get(task.id);
                            if (!ganttTask) return <div key={task.id} className="h-12"></div>;

                            const offsetDays = dateUtils.getDaysBetween(chartStartDate, ganttTask.ganttStartDate) -1;
                            const durationDays = dateUtils.getDaysBetween(ganttTask.ganttStartDate, ganttTask.ganttEndDate);
                            const startDay = dateUtils.getDaysBetween(projectStartDate, ganttTask.ganttStartDate);
                            const endDay = dateUtils.getDaysBetween(projectStartDate, ganttTask.ganttEndDate);
                            
                            const agentDetail = AGENT_DETAILS[ganttTask.assignedTo];
                            if (!agentDetail) return null;

                            const agentColor = agentDetail.color;
                            const agentBgColor = agentColor.replace('text-', 'bg-').replace('-400', '-500/70');
                            const agentBorderColor = agentColor.replace('text-', 'border-').replace('-400', '-400');
                            const progress = ganttTask.status === TaskStatus.COMPLETED ? 100 : (ganttTask.progress || 0);
                            
                            const isHovered = isEditing && hoveredTaskId === ganttTask.id;
                            const isRelated = isEditing && relatedTaskIds.has(ganttTask.id);
                            const isDimmed = isEditing && hoveredTaskId && !isRelated;

                            return (
                                <div key={ganttTask.id} className="h-12 relative flex items-center">
                                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 4rem)` }}>
                                        {timelineDates.map((date, index) => {
                                             const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                             return <div key={index} className={`h-full border-r border-accent ${isWeekend ? 'bg-primary/20' : ''}`}></div>
                                        })}
                                    </div>
                                     <div
                                        draggable={isEditing}
                                        onDragStart={(e) => handleDragStart(e, ganttTask)}
                                        onDragEnd={handleDragEnd}
                                        onDrop={(e) => handleTaskBarDrop(e, ganttTask)}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onMouseEnter={(e) => {
                                            if (isEditing) {
                                                const taskElement = e.currentTarget as HTMLDivElement;
                                                const rect = taskElement.getBoundingClientRect();
                                                setHoveredTaskId(ganttTask.id);
                                                const allPrerequisites = getAllPrerequisites(ganttTask.id, orderedTasks);
                                                
                                                setTooltip({
                                                    content: { prerequisites: allPrerequisites, startDay, endDay, duration: durationDays },
                                                    position: { top: rect.top, left: rect.left, width: rect.width }
                                                });
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            if (isEditing) {
                                                setHoveredTaskId(null);
                                                setTooltip(null);
                                            }
                                        }}
                                        onClick={() => !isEditing && onTaskClick(ganttTask)}
                                        className={`absolute h-8 rounded-md shadow-md flex items-center px-3 text-white overflow-hidden transition-all duration-300 ${agentBgColor} border-l-4 ${agentBorderColor} ${isEditing ? 'cursor-grab hover:scale-105' : 'cursor-pointer hover:opacity-80'} ${draggingTaskId === ganttTask.id ? 'opacity-50 scale-105' : ''} ${isDimmed ? 'opacity-30' : 'opacity-100'} ${isHovered ? 'ring-2 ring-offset-2 ring-offset-secondary ring-highlight' : ''}`}
                                        style={{
                                            left: `${Math.max(0, offsetDays) * 4}rem`,
                                            width: `${durationDays * 4}rem`,
                                        }}
                                    >
                                        <div className="absolute top-0 left-0 h-full bg-black/20" style={{ width: `${progress}%`}}></div>
                                        <span className="relative truncate font-semibold text-xs">{ganttTask.title}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {isEditing && tooltip && (
                <div
                    className="fixed z-50 p-4 bg-primary rounded-xl border border-accent shadow-2xl w-64 pointer-events-none transition-opacity duration-200 animate-fadeIn"
                    style={{ 
                        bottom: `${window.innerHeight - tooltip.position.top + 8}px`,
                        left: `${tooltip.position.left + tooltip.position.width / 2}px`,
                        transform: 'translateX(-50%)',
                        animationDuration: '0.2s'
                    }}
                >
                     <div className="space-y-3">
                        <div>
                            <h5 className="text-sm font-bold text-highlight mb-2">Schedule</h5>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <span className="text-xs text-text-secondary">Start</span>
                                    <p className="font-bold text-light">Day {tooltip.content.startDay}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-text-secondary">End</span>
                                    <p className="font-bold text-light">Day {tooltip.content.endDay}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-text-secondary">Duration</span>
                                    <p className="font-bold text-light">{tooltip.content.duration}d</p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-accent pt-2">
                            <h5 className="text-sm font-bold text-highlight mb-1">All Prerequisites</h5>
                            {tooltip.content.prerequisites.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-light space-y-1 max-h-24 overflow-y-auto">
                                    {tooltip.content.prerequisites.map((name, i) => <li key={i} className="truncate">{name}</li>)}
                                </ul>
                            ) : (
                                <p className="text-sm text-text-secondary">None</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
