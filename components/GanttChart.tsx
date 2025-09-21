import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
    level: number;
}

const calculateTaskDates = (tasks: Task[], projectStartDate: Date): GanttTask[] => {
    const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
    const ganttTaskMap = new Map<string, GanttTask>();

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

    const inDegree = new Map<string, number>();
    tasks.forEach(task => {
        const validDependencies = (task.dependsOn || []).filter(depId => taskMap.has(depId));
        inDegree.set(task.id, validDependencies.length);
    });

    const queue: string[] = [];
    tasks.forEach(task => {
        if (task.startDate || inDegree.get(task.id) === 0) {
            queue.push(task.id);
        }
    });

    let processedCount = 0;
    while (queue.length > 0) {
        const taskId = queue.shift()!;
        
        if (ganttTaskMap.has(taskId)) continue;

        const task = taskMap.get(taskId)!;
        
        let ganttStartDate: Date;
        if (task.startDate) {
            ganttStartDate = new Date(task.startDate);
        } else if (task.dependsOn && task.dependsOn.length > 0) {
            const parentEndDates = task.dependsOn
                .map(depId => ganttTaskMap.get(depId)?.ganttEndDate)
                .filter((d): d is Date => !!d);

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

        ganttTaskMap.set(taskId, { ...task, ganttStartDate, ganttEndDate, level: 0 });
        processedCount++;

        const children = childrenMap.get(taskId) || [];
        for (const childId of children) {
            const currentInDegree = inDegree.get(childId)!;
            inDegree.set(childId, currentInDegree - 1);
            
            if (inDegree.get(childId) === 0 && !taskMap.get(childId)?.startDate) {
                queue.push(childId);
            }
        }
    }

    if (processedCount < tasks.length) {
        console.warn("Circular dependency detected. Assigning fallback dates to un-processed tasks.");
        tasks.forEach(task => {
            if (!ganttTaskMap.has(task.id)) {
                console.warn(`- Task in cycle: ${task.title} (${task.id})`);
                const ganttStartDate = task.startDate ? new Date(task.startDate) : projectStartDate;
                const duration = Math.max(1, task.estimatedDuration || 1);
                const ganttEndDate = dateUtils.addDays(ganttStartDate, duration - 1);
                ganttTaskMap.set(task.id, { ...task, ganttStartDate, ganttEndDate, level: 0 });
            }
        });
    }
    
    // Second pass to adjust parent task dates to be containers for their children
    const parentChildMap = new Map<string, string[]>();
    tasks.forEach(task => {
        if (task.parentId) {
            if (!parentChildMap.has(task.parentId)) {
                parentChildMap.set(task.parentId, []);
            }
            parentChildMap.get(task.parentId)!.push(task.id);
        }
    });

    parentChildMap.forEach((childrenIds, parentId) => {
        const parentGanttTask = ganttTaskMap.get(parentId);
        if (parentGanttTask) {
            const childrenGanttTasks = childrenIds.map(id => ganttTaskMap.get(id)).filter((t): t is GanttTask => !!t);

            if (childrenGanttTasks.length > 0) {
                const childStartTimes = childrenGanttTasks.map(c => c.ganttStartDate.getTime());
                const childEndTimes = childrenGanttTasks.map(c => c.ganttEndDate.getTime());
                
                parentGanttTask.ganttStartDate = new Date(Math.min(...childStartTimes));
                parentGanttTask.ganttEndDate = new Date(Math.max(...childEndTimes));
            }
        }
    });


    const finalGanttTasks = tasks.map(task => ganttTaskMap.get(task.id)!).filter(Boolean);

    // Calculate indentation level
    const levelMap = new Map<string, number>();
    const calculateLevel = (taskId: string): number => {
        if (levelMap.has(taskId)) return levelMap.get(taskId)!;
        const task = taskMap.get(taskId);
        if (!task || !task.parentId || !taskMap.has(task.parentId)) {
            levelMap.set(taskId, 0);
            return 0;
        }
        const level = calculateLevel(task.parentId) + 1;
        levelMap.set(taskId, level);
        return level;
    };

    finalGanttTasks.forEach(gt => {
        gt.level = calculateLevel(gt.id);
    });

    return finalGanttTasks;
};

interface TooltipData {
    content: {
        prerequisites: string[];
        startDay: number;
        endDay: number;
        duration: number;
    };
    targetRect: DOMRect;
}


export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick, onTaskUpdate, isEditing, setIsEditing, onSaveChanges }) => {
    const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
    const [history, setHistory] = useState<Task[][]>([]);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ index: number; y: number } | null>(null);
    const ganttGridRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [dragOffsetX, setDragOffsetX] = useState(0);

    // Tooltip related state and refs
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<React.CSSProperties>({ visibility: 'hidden', opacity: 0 });

    useEffect(() => {
        setOrderedTasks(tasks);
        setHistory([]);
    }, [tasks]);

    const { ganttTasks, chartStartDate, totalDays, projectStartDate } = useMemo(() => {
        if (tasks.length === 0) {
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
        const chartEndDate = maxDate;
        let totalDays = calculatedGanttTasks.length > 0 ? dateUtils.getDaysBetween(chartStartDate, chartEndDate) : 35;
        totalDays = Math.max(totalDays, 35);
        
        return { ganttTasks: calculatedGanttTasks, chartStartDate, totalDays, projectStartDate };
    }, [orderedTasks, tasks]);

    const timelineDates: Date[] = useMemo(() => {
        return Array.from({ length: totalDays }, (_, i) => dateUtils.addDays(chartStartDate, i));
    }, [chartStartDate, totalDays]);

    const ganttTasksMap = useMemo(() => new Map(ganttTasks.map(gt => [gt.id, gt])), [ganttTasks]);

    useLayoutEffect(() => {
        if (!tooltipData || !tooltipRef.current) {
            setTooltipPosition({ visibility: 'hidden', opacity: 0 });
            return;
        }
    
        const tooltipEl = tooltipRef.current;
        const taskRect = tooltipData.targetRect;
        const tooltipRect = tooltipEl.getBoundingClientRect();
    
        if (tooltipRect.width === 0 || tooltipRect.height === 0) {
            return;
        }
    
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        const OFFSET = 15; // Increased offset for more spacing
    
        // Default to position above the task
        let top = taskRect.top - tooltipRect.height - OFFSET;
    
        // If it goes off-screen at the top, flip it to be below the task
        if (top < OFFSET) {
            top = taskRect.bottom + OFFSET;
        }
    
        // Center horizontally relative to the task
        let left = taskRect.left + (taskRect.width / 2) - (tooltipRect.width / 2);
    
        // Adjust horizontal position to keep it inside the viewport
        if (left < OFFSET) {
            left = OFFSET;
        }
        if (left + tooltipRect.width > vpWidth - OFFSET) {
            left = vpWidth - tooltipRect.width - OFFSET;
        }
    
        // Final check: if it's *still* off-screen vertically (e.g., small screens), center it.
        if (top < OFFSET || top + tooltipRect.height > vpHeight - OFFSET) {
            setTooltipPosition({
                position: 'fixed',
                top: `50%`,
                left: `50%`,
                transform: 'translate(-50%, -50%)',
                visibility: 'visible',
                opacity: 1,
            });
        } else {
            setTooltipPosition({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                visibility: 'visible',
                opacity: 1,
            });
        }
    }, [tooltipData]);

    const updateTasksAndStoreHistory = (updateFn: (currentTasks: Task[]) => Task[]) => {
        setOrderedTasks(currentTasks => {
            setHistory(prevHistory => [...prevHistory, currentTasks]);
            return updateFn(currentTasks);
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
        const visitedForQueue = new Set<string>();

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
        setOrderedTasks(tasks);
        setIsEditing(false);
        setHistory([]);
    };

    const hasPath = (fromId: string, toId: string, tasks: Task[]): boolean => {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const visited = new Set<string>();
        const queue = [fromId];
    
        while (queue.length > 0) {
            const currentId = queue.shift()!;
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
                const draggedDependencies = currentTasks.find(t => t.id === draggedTaskId)?.dependsOn || [];
                
                return currentTasks.map(task => {
                    if (task.id === targetTask.id) {
                        return { ...task, dependsOn: draggedDependencies, startDate: undefined };
                    }
                    return task;
                });
    
            } else {
                const newTasks = [...currentTasks];
                const draggedTaskIndex = newTasks.findIndex(t => t.id === draggedTaskId);
    
                if (draggedTaskIndex === -1) return currentTasks;
    
                const draggedTask = { ...newTasks[draggedTaskIndex] };
                draggedTask.dependsOn = Array.from(new Set([...(draggedTask.dependsOn || []), targetTask.id]));
                draggedTask.startDate = undefined;
                newTasks[draggedTaskIndex] = draggedTask;
                
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
        
        const dayWidth = 64;
        
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
        allPrereqIds.add(hoveredTaskId);

        return allPrereqIds;
    }, [isEditing, hoveredTaskId, orderedTasks]);

    if (tasks.length === 0) {
        return (
            <div className="bg-secondary p-6 rounded-xl border border-accent text-center text-text-secondary h-64 flex items-center justify-center">
                No tasks to display in the timeline.
            </div>
        );
    }
    
    const tooltipPortal = isEditing ? createPortal(
        <div
            ref={tooltipRef}
            className="fixed z-50 p-4 bg-primary rounded-xl border border-accent shadow-2xl w-64 pointer-events-none transition-opacity duration-200"
            style={tooltipPosition}
        >
            {tooltipData?.content && (
                <div className="space-y-3">
                    <div>
                        <h5 className="text-sm font-bold text-highlight mb-2">Schedule</h5>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <span className="text-xs text-text-secondary">Start</span>
                                <p className="font-bold text-light">Day {tooltipData.content.startDay}</p>
                            </div>
                            <div>
                                <span className="text-xs text-text-secondary">End</span>
                                <p className="font-bold text-light">Day {tooltipData.content.endDay}</p>
                            </div>
                            <div>
                                <span className="text-xs text-text-secondary">Duration</span>
                                <p className="font-bold text-light">{tooltipData.content.duration}d</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-accent pt-2">
                        <h5 className="text-sm font-bold text-highlight mb-1">All Prerequisites</h5>
                        {tooltipData.content.prerequisites.length > 0 ? (
                            <ul className="list-disc list-inside text-sm text-light space-y-1 max-h-24 overflow-y-auto">
                                {tooltipData.content.prerequisites.map((name, i) => <li key={i} className="truncate">{name}</li>)}
                            </ul>
                        ) : (
                            <p className="text-sm text-text-secondary">None</p>
                        )}
                    </div>
                </div>
            )}
        </div>,
        document.getElementById('tooltip-root')!
    ) : null;
    
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
            <div className="flex text-sm">
                <div 
                    ref={sidebarRef}
                    className="w-72 border-r border-accent font-semibold flex-shrink-0 relative"
                    onDrop={handleSidebarDrop}
                    onDragOver={handleSidebarDragOver}
                    onDragLeave={() => setDropIndicator(null)}
                >
                    <div className="h-16 border-b border-accent flex items-center p-4 text-light bg-primary/30 sticky top-0 z-20">Task Name</div>
                    <div className="divide-y divide-accent">
                        {ganttTasks.map(task => (
                            <div 
                                key={task.id} 
                                className={`h-12 p-4 flex items-center truncate transition-opacity ${draggingTaskId === task.id ? 'opacity-30' : ''}`}
                                title={task.title}
                                style={{ paddingLeft: `${1 + task.level * 1.5}rem` }}
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
                    <div style={{ minWidth: `${totalDays * 64}px` }}>
                        <div className="sticky top-0 z-10 bg-secondary">
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 4rem)` }}>
                                {timelineDates.map((date, index) => {
                                    const relativeDay = dateUtils.getDaysBetween(projectStartDate, date);
                                    return (
                                    <div key={index} className="h-16 border-b border-r border-accent flex flex-col items-center justify-center">
                                        <span className="text-xs text-text-secondary">Day</span>
                                        <span className="font-bold text-lg text-light">{relativeDay}</span>
                                    </div>
                                )})}
                            </div>
                        </div>
                         <div className="relative divide-y divide-accent">
                            {ganttTasks.map((ganttTask) => {
                                if (!ganttTask) return <div key={ganttTask.id} className="h-12"></div>;

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
                                            {timelineDates.map((_, index) => {
                                                 return <div key={index} className="h-full border-r border-accent"></div>
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
                                                    setHoveredTaskId(ganttTask.id);
                                                    setTooltipData({
                                                        content: {
                                                            prerequisites: getAllPrerequisites(ganttTask.id, orderedTasks),
                                                            startDay,
                                                            endDay,
                                                            duration: durationDays,
                                                        },
                                                        targetRect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                                                    });
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                if (isEditing) {
                                                    setHoveredTaskId(null);
                                                    setTooltipData(null);
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
            </div>
            {tooltipPortal}
        </div>
    );
};
