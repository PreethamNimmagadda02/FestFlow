
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EventSetupForm } from './components/FestivalSetupForm';
import { Dashboard } from './components/Dashboard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { AgentName, Task, Approval, ActivityLog, AgentStatus, TaskStatus } from './types';
import { AGENT_NAMES, MAX_TASK_RETRIES } from './constants';
import { decomposeGoal, executeTask } from './services/geminiService';

const ResultModal: React.FC<{ task: Task; onClose: () => void }> = React.memo(({ task, onClose }) => {
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


const getInitialState = <T,>(key: string, defaultValue: T): T => {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            const parsed = JSON.parse(storedValue);
            if (key === 'festflow_logs' && Array.isArray(parsed)) {
                return parsed.map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) })) as T;
            }
            return parsed;
        }
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
    }
    return defaultValue;
};

const App: React.FC = () => {
    const initialAgentStatus = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: AgentStatus.IDLE}), {} as Record<AgentName, AgentStatus>);
    const initialAgentWork = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: null}), {} as Record<AgentName, string | null>);
    
    const [tasks, setTasks] = useState<Task[]>(() => getInitialState('festflow_tasks', []));
    const [approvals, setApprovals] = useState<Approval[]>(() => getInitialState('festflow_approvals', []));
    const [logs, setLogs] = useState<ActivityLog[]>(() => getInitialState('festflow_logs', []));
    const [agentStatus, setAgentStatus] = useState<Record<AgentName, AgentStatus>>(() => getInitialState('festflow_agentStatus', initialAgentStatus));
    const [agentWork, setAgentWork] = useState<Record<AgentName, string | null>>(() => getInitialState('festflow_agentWork', initialAgentWork));
    const [isStarted, setIsStarted] = useState<boolean>(() => getInitialState('festflow_isStarted', false));

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewingResultTask, setViewingResultTask] = useState<Task | null>(null);
    const progressIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
    const processingTasks = useRef<Set<string>>(new Set());

    useEffect(() => {
        try {
            localStorage.setItem('festflow_tasks', JSON.stringify(tasks));
            localStorage.setItem('festflow_approvals', JSON.stringify(approvals));
            localStorage.setItem('festflow_logs', JSON.stringify(logs));
            localStorage.setItem('festflow_agentStatus', JSON.stringify(agentStatus));
            localStorage.setItem('festflow_agentWork', JSON.stringify(agentWork));
            localStorage.setItem('festflow_isStarted', JSON.stringify(isStarted));
        } catch (e) {
            console.error("Failed to save state to local storage", e);
        }
    }, [tasks, approvals, logs, agentStatus, agentWork, isStarted]);

    // Sync selected task with the main tasks list to reflect updates
    useEffect(() => {
        if (selectedTask) {
            const updatedSelectedTask = tasks.find(t => t.id === selectedTask.id);
            if (updatedSelectedTask) {
                setSelectedTask(updatedSelectedTask);
            } else {
                setSelectedTask(null); // Task was removed
            }
        }
    }, [tasks, selectedTask]);
    
    const addLog = useCallback((agent: AgentName, message: string) => {
        setLogs(prev => [...prev, { agent, message, timestamp: new Date() }]);
    }, []);

    // Automatically calculate progress and status for parent tasks
    useEffect(() => {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const parentUpdates = new Map<string, { completed: number; total: number }>();
        const completedTaskIds = new Set(tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.id));
        const subTasksByParent = new Map<string, Task[]>();

        tasks.forEach(task => {
            if (task.parentId && taskMap.has(task.parentId)) {
                if (!parentUpdates.has(task.parentId)) {
                    parentUpdates.set(task.parentId, { completed: 0, total: 0 });
                }
                const stats = parentUpdates.get(task.parentId)!;
                stats.total += 1;
                if (task.status === TaskStatus.COMPLETED) {
                    stats.completed += 1;
                }

                if (!subTasksByParent.has(task.parentId)) {
                    subTasksByParent.set(task.parentId, []);
                }
                subTasksByParent.get(task.parentId)!.push(task);
            }
        });

        if (parentUpdates.size > 0) {
            setTasks(currentTasks => {
                let hasChanged = false;
                const newTasks = currentTasks.map(task => {
                    // Check if the current task is a parent task that needs updating
                    if (parentUpdates.has(task.id)) {
                        const parentTask = task; // for clarity
                        const stats = parentUpdates.get(parentTask.id)!;
                        const newProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        const allSubtasksCompleted = stats.total > 0 && stats.completed === stats.total;

                        let newStatus = parentTask.status;
                        
                        if (allSubtasksCompleted && parentTask.status !== TaskStatus.COMPLETED) {
                            newStatus = TaskStatus.COMPLETED;
                        } else if (!allSubtasksCompleted && parentTask.status === TaskStatus.COMPLETED) {
                            newStatus = TaskStatus.IN_PROGRESS; // Revert to In Progress
                        } else if (parentTask.status === TaskStatus.PENDING) {
                            const subTasks = subTasksByParent.get(parentTask.id) || [];
                            const isAnySubtaskReady = subTasks.some(sub => 
                                (sub.dependsOn || []).every(depId => completedTaskIds.has(depId))
                            );

                            if (isAnySubtaskReady) {
                                newStatus = TaskStatus.IN_PROGRESS;
                            }
                        }

                        if (parentTask.progress !== newProgress || parentTask.status !== newStatus) {
                            hasChanged = true;
                            return { ...parentTask, progress: newProgress, status: newStatus };
                        }
                    }
                    return task;
                });

                if (hasChanged) {
                    // Log changes after calculating them to avoid issues inside the map
                    const originalTasksMap = new Map(currentTasks.map(t => [t.id, t]));
                    newTasks.forEach(newTask => {
                        const originalTask = originalTasksMap.get(newTask.id);
                        if(originalTask && originalTask.status !== newTask.status && parentUpdates.has(newTask.id)) {
                            if(newTask.status === TaskStatus.COMPLETED) {
                                addLog(newTask.assignedTo, `All sub-tasks for "${newTask.title}" are complete. Marking parent task as complete.`);
                            } else if (originalTask.status === TaskStatus.COMPLETED) {
                                addLog(newTask.assignedTo, `A sub-task for "${newTask.title}" is no longer complete. Reverting parent task to In Progress.`);
                            } else if (newTask.status === TaskStatus.IN_PROGRESS) {
                                addLog(AgentName.MASTER_PLANNER, `A sub-task for "${newTask.title}" is ready. Marking parent task as In Progress.`);
                            }
                        }
                    });
                }
                
                return hasChanged ? newTasks : currentTasks;
            });
        }
    }, [tasks, addLog]);
    
    useEffect(() => {
        const activeTasksByAgent: Record<AgentName, Task[]> = AGENT_NAMES.reduce(
            (acc, name) => ({ ...acc, [name]: [] }),
            {} as Record<AgentName, Task[]>
        );

        // Identify all parent tasks. A parent task is any task that is referenced in another task's `parentId`.
        const parentTaskIds = new Set(tasks.map(t => t.parentId).filter((id): id is string => !!id));
        
        // An "active" task is one an agent is currently supposed to be working on.
        // It must be an executable task (not a parent container), be in progress, and not yet finished.
        tasks.forEach(task => {
            if (!parentTaskIds.has(task.id) && task.status === TaskStatus.IN_PROGRESS && (task.progress ?? 0) < 100) {
                 activeTasksByAgent[task.assignedTo].push(task);
            }
        });

        const newAgentStatus = { ...agentStatus };
        const newAgentWork = { ...agentWork };
        let statusHasChanged = false;
        let workHasChanged = false;

        AGENT_NAMES.forEach(agentName => {
            if (agentName === AgentName.MASTER_PLANNER) return; // Master Planner is handled separately.

            const activeTasks = activeTasksByAgent[agentName];
            const isWorking = activeTasks.length > 0;
            const currentStatus = agentStatus[agentName];

            if (isWorking) {
                if (currentStatus !== AgentStatus.WORKING && currentStatus !== AgentStatus.ERROR) {
                    newAgentStatus[agentName] = AgentStatus.WORKING;
                    statusHasChanged = true;
                }
                // Update work to the first active task. This will now always be an executable task.
                const newWork = activeTasks[0].id;
                if (agentWork[agentName] !== newWork) {
                    newAgentWork[agentName] = newWork;
                    workHasChanged = true;
                }
            } else { // Agent has no active tasks.
                if (currentStatus === AgentStatus.WORKING) {
                    newAgentStatus[agentName] = AgentStatus.IDLE;
                    statusHasChanged = true;
                }
                if (agentWork[agentName] !== null) {
                    newAgentWork[agentName] = null;
                    workHasChanged = true;
                }
            }
        });
        
        if (statusHasChanged) {
            setAgentStatus(newAgentStatus);
        }
        if (workHasChanged) {
            setAgentWork(newAgentWork);
        }
    }, [tasks, agentStatus, agentWork]);


    const handleReset = useCallback(() => {
        setTasks([]);
        setApprovals([]);
        setLogs([]);
        setAgentStatus(initialAgentStatus);
        setAgentWork(initialAgentWork);
        setIsStarted(false);
        setError(null);
        setIsLoading(false);
        setSelectedTask(null);
        setViewingResultTask(null);
        processingTasks.current.clear();
        Object.values(progressIntervals.current).forEach(clearInterval);
        progressIntervals.current = {};
        
        localStorage.removeItem('festflow_tasks');
        localStorage.removeItem('festflow_approvals');
        localStorage.removeItem('festflow_logs');
        localStorage.removeItem('festflow_agentStatus');
        localStorage.removeItem('festflow_agentWork');
        localStorage.removeItem('festflow_isStarted');
    }, [initialAgentStatus, initialAgentWork]);

    const handleGoalSubmit = useCallback(async (goal: string) => {
        handleReset(); // Clear previous state for a fresh start
        setIsLoading(true);
        setError(null);
        
        setIsStarted(true);

        addLog(AgentName.MASTER_PLANNER, 'Received new event goal. Starting decomposition...');
        setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.WORKING }));
        setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: "Decomposing event goal..." }));

        try {
            const decomposedTasks = await decomposeGoal(goal);
            addLog(AgentName.MASTER_PLANNER, `Successfully decomposed goal into ${decomposedTasks.length} tasks.`);
            setTasks(decomposedTasks);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            addLog(AgentName.MASTER_PLANNER, `Error: ${errorMessage}`);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.ERROR }));
        } finally {
            setIsLoading(false);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.IDLE }));
            setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: null }));
        }
    }, [addLog, handleReset]);

    const processTask = useCallback(async (task: Task) => {
        // Parent tasks (tasks that have sub-tasks) are non-executable containers.
        // Their status is derived from their sub-tasks.
        const isParentTask = tasks.some(subTask => subTask.parentId === task.id);
        if (isParentTask) {
            return; // Skip processing for parent tasks.
        }

        // A task without sub-tasks is treated as a normal, executable task.
        // Don't re-process a task that's already in the processing queue.
        if (processingTasks.current.has(task.id)) return;
        
        processingTasks.current.add(task.id);
        addLog(task.assignedTo, `Starting task: "${task.title}"`);
        
        const isContentGenerationTask = task.assignedTo === AgentName.SPONSORSHIP_OUTREACH || task.assignedTo === AgentName.MARKETING;

        if (isContentGenerationTask) {
            try {
                addLog(task.assignedTo, `Generating content for "${task.title}"...`);
                const content = await executeTask(task);

                // Use the setTasks updater to atomically check the task's current state
                // before creating an approval, preventing a race condition if the user
                // manually completes the task while content is being generated.
                setTasks(prev => {
                    const taskInState = prev.find(t => t.id === task.id);

                    if (taskInState && taskInState.status === TaskStatus.IN_PROGRESS) {
                        // Task is still active, proceed with the approval flow.
                        setApprovals(prevApprovals => [...prevApprovals, {
                            id: `approval-${task.id}`,
                            taskId: task.id,
                            agent: task.assignedTo,
                            title: `Approval for: ${taskInState.title}`,
                            content: content,
                            status: 'pending'
                        }]);
                        addLog(task.assignedTo, `Task "${taskInState.title}" requires approval.`);
                        return prev.map(t => t.id === task.id ? {...t, status: TaskStatus.AWAITING_APPROVAL, progress: 100, customPrompt: undefined} : t);
                    } else {
                        // Task was manually completed. Discard the result.
                        addLog(AgentName.MASTER_PLANNER, `Discarding generated content for "${task.title}" as it was manually completed.`);
                        return prev;
                    }
                });

            } catch(e) {
                const currentRetries = task.retries || 0;
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';

                if (currentRetries < MAX_TASK_RETRIES) {
                     addLog(task.assignedTo, `Error on task "${task.title}": ${errorMessage}. Retrying (${currentRetries + 1}/${MAX_TASK_RETRIES}).`);
                     setTasks(prev => prev.map(t => t.id === task.id ? {...t, retries: currentRetries + 1, progress: 0} : t));
                } else {
                    addLog(task.assignedTo, `Error on task "${task.title}": ${errorMessage}. Task failed after ${MAX_TASK_RETRIES} retries.`);
                    setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: TaskStatus.FAILED, progress: 0} : t));
                    setAgentStatus(prev => ({...prev, [task.assignedTo]: AgentStatus.ERROR}));
                    setAgentWork(prev => ({...prev, [task.assignedTo]: null}));
                }
            } finally {
                processingTasks.current.delete(task.id);
            }
        } else { // Simulation for non-content tasks like logistics
            const processingTime = 2000 + Math.random() * 3000;
            const updateInterval = 100;
            const progressSteps = processingTime / updateInterval;
            let progressIncrement = 100 / progressSteps;

            if (progressIntervals.current[task.id]) {
                clearInterval(progressIntervals.current[task.id]);
            }

            progressIntervals.current[task.id] = setInterval(() => {
                setTasks(prevTasks => prevTasks.map(t => {
                    if (t.id === task.id && t.status === TaskStatus.IN_PROGRESS) {
                        const newProgress = Math.min(100, (t.progress || 0) + progressIncrement);
                        return { ...t, progress: newProgress };
                    }
                    return t;
                }));
            }, updateInterval);

            setTimeout(() => {
                clearInterval(progressIntervals.current[task.id]);
                delete progressIntervals.current[task.id];
                
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, progress: 100} : t));
                addLog(task.assignedTo, `Task "${task.title}" work is finished. Awaiting manual completion.`);
                processingTasks.current.delete(task.id);
            }, processingTime);
        }

    }, [addLog, tasks]);

    useEffect(() => {
        const completedTaskIds = new Set(tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.id));
        const parentTaskIds = new Set(tasks.map(t => t.parentId).filter((id): id is string => !!id));
        
        const tasksToStart = tasks.filter(task => 
            !parentTaskIds.has(task.id) &&
            task.status === TaskStatus.PENDING && 
            (task.startDate || (task.dependsOn || []).every(depId => completedTaskIds.has(depId)))
        );

        if (tasksToStart.length > 0) {
            addLog(AgentName.MASTER_PLANNER, `Dependencies met for ${tasksToStart.length} task(s). Starting now.`);
            setTasks(prevTasks => prevTasks.map(t => 
                tasksToStart.some(startTask => startTask.id === t.id) ? { ...t, status: TaskStatus.IN_PROGRESS } : t
            ));
        }
    }, [tasks, addLog]);

    useEffect(() => {
        const tasksToProcess = tasks.filter(t =>
            t.status === TaskStatus.IN_PROGRESS &&
            !processingTasks.current.has(t.id) &&
            (t.progress ?? 0) < 100
        );
        tasksToProcess.forEach(task => processTask(task));
    }, [tasks, processTask]);

    useEffect(() => {
        return () => {
            Object.values(progressIntervals.current).forEach(clearInterval);
        };
    }, []);

    const handleApproval = useCallback((approvalId: string, decision: 'approved' | 'rejected', newContent?: string, customPrompt?: string) => {
        const approval = approvals.find(a => a.id === approvalId);
        if (!approval) return;

        setApprovals(prev => prev.filter(a => a.id !== approvalId));
        
        const relatedTask = tasks.find(t => t.id === approval.taskId);

        if (relatedTask) {
            addLog(AgentName.MASTER_PLANNER, `Decision received for "${relatedTask.title}": ${decision.toUpperCase()}`);

            if (decision === 'approved') {
                setTasks(prev => prev.map(t => t.id === approval.taskId ? {
                    ...t, 
                    status: TaskStatus.COMPLETED, 
                    progress: 100,
                    approvedContent: newContent ?? approval.content,
                    customPrompt: undefined,
                } : t));
                addLog(relatedTask.assignedTo, `Task approved: "${relatedTask.title}". Finalizing.`);
            } else {
                 const logMessage = customPrompt 
                     ? `Task rejected: "${relatedTask.title}". Will attempt to regenerate with a new prompt.`
                     : `Task rejected: "${relatedTask.title}". Will attempt to regenerate.`;
                 
                 setTasks(prev => prev.map(t => t.id === approval.taskId ? {
                    ...t, 
                    status: TaskStatus.IN_PROGRESS, 
                    progress: 0, 
                    retries: 0, 
                    customPrompt: customPrompt,
                    approvedContent: undefined
                } : t));
                 addLog(relatedTask.assignedTo, logMessage);
            }
        }
    }, [approvals, tasks, addLog]);

    const handleCompleteTask = useCallback((taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
             addLog(AgentName.MASTER_PLANNER, `User marked task "${task.title}" as complete.`);
             setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: TaskStatus.COMPLETED, progress: 100} : t));
        }
    }, [tasks, addLog]);
    
    const handleReassignTask = useCallback((taskId: string, newAgent: AgentName) => {
        const taskToReassign = tasks.find(t => t.id === taskId);
        if (!taskToReassign) return;
        
        addLog(newAgent, `Task "${taskToReassign.title}" has been reassigned to me. Resetting and starting work.`);
        
        setTasks(prev => prev.map(t => 
            t.id === taskId 
            ? { ...t, assignedTo: newAgent, status: TaskStatus.IN_PROGRESS, progress: 0, retries: 0 } 
            : t
        ));
    }, [tasks, addLog]);
    
    const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }, []);

    const handleGanttSaveChanges = useCallback((orderedTasks: Task[]) => {
        addLog(AgentName.MASTER_PLANNER, "Timeline saved. Resetting all tasks and clearing previous results to start the new plan from a clean slate.");

        const newPlanTasks = orderedTasks.map(task => ({
            ...task,
            status: TaskStatus.PENDING,
            progress: 0,
            retries: 0,
            approvedContent: undefined,
        }));

        setTasks(newPlanTasks);
        setApprovals([]);
    }, [addLog]);


    return (
        <div className="min-h-screen bg-primary text-light flex flex-col">
            <Header onReset={handleReset} />
            <main className="flex-grow p-4 md:p-8 space-y-8">
                <EventSetupForm onSubmit={handleGoalSubmit} isLoading={isLoading} />
                {error && <div className="bg-danger/20 border border-danger text-red-300 p-4 rounded-lg animate-fadeIn">{error}</div>}
                {isStarted && (
                    <Dashboard
                        tasks={tasks}
                        approvals={approvals}
                        logs={logs}
                        agentStatus={agentStatus}
                        agentWork={agentWork}
                        onApproval={handleApproval}
                        onCompleteTask={handleCompleteTask}
                        onReassignTask={handleReassignTask}
                        onTaskClick={setSelectedTask}
                        onViewResult={setViewingResultTask}
                        onTaskUpdate={handleUpdateTask}
                        onGanttSaveChanges={handleGanttSaveChanges}
                    />
                )}
            </main>
            {selectedTask && <TaskDetailModal task={selectedTask} allTasks={tasks} onClose={() => setSelectedTask(null)} onTaskUpdate={handleUpdateTask} />}
            {viewingResultTask && <ResultModal task={viewingResultTask} onClose={() => setViewingResultTask(null)} />}
        </div>
    );
};

export default App;
