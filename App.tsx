import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EventSetupForm } from './components/FestivalSetupForm';
import { Dashboard } from './components/Dashboard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { LoadSessionModal } from './components/LoadSessionModal';
import { AgentName, Task, Approval, ActivityLog, AgentStatus, TaskStatus, AppState, SavedSession } from './types';
import { AGENT_NAMES, MAX_TASK_RETRIES } from './constants';
import { decomposeGoal, executeTask } from './services/geminiService';
import { createSession, updateSession, getSavedSessions, loadSessionFromFirestore, deleteSession } from './services/firestoreService';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { FullScreenLoader } from './components/FullScreenLoader';
import { ConfirmationModal } from './components/ConfirmationModal';

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
            if (parsed === null) return defaultValue;

            // Basic type validation to prevent crashes from malformed localStorage data.
            if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
            if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue) && (typeof parsed !== 'object' || Array.isArray(parsed))) return defaultValue;
            if (typeof defaultValue === 'boolean' && typeof parsed !== 'boolean') return defaultValue;

            // Special handling for logs with date hydration
            if (key === 'festflow_logs' && Array.isArray(parsed)) {
                return parsed.map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) })) as T;
            }
            
            return parsed as T;
        }
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
    }
    return defaultValue;
};


const App: React.FC = () => {
    const { currentUser, loading } = useAuth();
    const initialAgentStatus = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: AgentStatus.IDLE}), {} as Record<AgentName, AgentStatus>);
    const initialAgentWork = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: null}), {} as Record<AgentName, string | null>);
    
    const [tasks, setTasks] = useState<Task[]>(() => getInitialState('festflow_tasks', []));
    const [approvals, setApprovals] = useState<Approval[]>(() => getInitialState('festflow_approvals', []));
    const [logs, setLogs] = useState<ActivityLog[]>(() => getInitialState('festflow_logs', []));
    const [agentStatus, setAgentStatus] = useState<Record<AgentName, AgentStatus>>(() => getInitialState('festflow_agentStatus', initialAgentStatus));
    const [agentWork, setAgentWork] = useState<Record<AgentName, string | null>>(() => getInitialState('festflow_agentWork', initialAgentWork));
    const [isStarted, setIsStarted] = useState<boolean>(() => getInitialState('festflow_isStarted', false));
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => getInitialState('festflow_currentSessionId', null));


    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewingResultTask, setViewingResultTask] = useState<Task | null>(null);
    const progressIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
    const processingTasks = useRef<Set<string>>(new Set());

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
    const [loadSessionsError, setLoadSessionsError] = useState<string | null>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteCurrentModalOpen, setIsDeleteCurrentModalOpen] = useState(false);


    useEffect(() => {
        try {
            localStorage.setItem('festflow_tasks', JSON.stringify(tasks));
            localStorage.setItem('festflow_approvals', JSON.stringify(approvals));
            localStorage.setItem('festflow_logs', JSON.stringify(logs));
            localStorage.setItem('festflow_agentStatus', JSON.stringify(agentStatus));
            localStorage.setItem('festflow_agentWork', JSON.stringify(agentWork));
            localStorage.setItem('festflow_isStarted', JSON.stringify(isStarted));
            if (currentSessionId) {
                localStorage.setItem('festflow_currentSessionId', JSON.stringify(currentSessionId));
            } else {
                localStorage.removeItem('festflow_currentSessionId');
            }
        } catch (e) {
            console.error("Failed to save state to local storage", e);
        }
    }, [tasks, approvals, logs, agentStatus, agentWork, isStarted, currentSessionId]);

    // Auto-save effect
    useEffect(() => {
        if (!isStarted || !currentUser || !currentSessionId) {
            return;
        }

        setSaveStatus('saving');
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(async () => {
            try {
                const currentState: AppState = { tasks, approvals, logs, agentStatus, agentWork, isStarted };
                await updateSession(currentUser.uid, currentSessionId, currentState);
                setSaveStatus('saved');
            } catch (error) {
                console.error("Auto-save failed:", error);
                setSaveStatus('error');
            }
        }, 2000); // 2-second debounce interval

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [tasks, approvals, logs, agentStatus, agentWork, isStarted, currentUser, currentSessionId]);

    useEffect(() => {
        if (selectedTask) {
            const updatedSelectedTask = tasks.find(t => t.id === selectedTask.id);
            if (updatedSelectedTask) {
                setSelectedTask(updatedSelectedTask);
            } else {
                setSelectedTask(null);
            }
        }
    }, [tasks, selectedTask]);
    
    const addLog = useCallback((agent: AgentName, message: string) => {
        setLogs(prev => [...prev, { agent, message, timestamp: new Date() }]);
    }, []);

    const processTask = useCallback(async (task: Task) => {
        if (processingTasks.current.has(task.id)) {
            return;
        }
    
        processingTasks.current.add(task.id);
        addLog(task.assignedTo, `Starting task: "${task.title}"`);
    
        const isContentGenerationTask = task.assignedTo === AgentName.SPONSORSHIP_OUTREACH || task.assignedTo === AgentName.MARKETING;
    
        try {
            if (isContentGenerationTask) {
                addLog(task.assignedTo, `Generating content for "${task.title}"...`);
                const content = await executeTask(task);
                
                // Perform state updates safely after the async operation.
                // This combined update prevents race conditions from nested state setters.
                setTasks(currentTasks => {
                    const taskToUpdate = currentTasks.find(t => t.id === task.id);
    
                    if (taskToUpdate && taskToUpdate.status === TaskStatus.IN_PROGRESS) {
                        // Task is still valid, so create the approval.
                        setApprovals(prevApprovals => {
                            // Safety check: Don't add a duplicate approval card.
                            if (prevApprovals.some(a => a.taskId === task.id && a.status === 'pending')) {
                                return prevApprovals;
                            }
                            return [
                                ...prevApprovals,
                                {
                                    id: `approval-${task.id}-${Date.now()}`,
                                    taskId: task.id,
                                    agent: task.assignedTo,
                                    title: `Approval for: ${task.title}`,
                                    content: content,
                                    status: 'pending',
                                },
                            ];
                        });
    
                        addLog(task.assignedTo, `Task "${task.title}" requires approval.`);
                        
                        // Return the new tasks array with the updated status.
                        return currentTasks.map(t =>
                            t.id === task.id ? { ...t, status: TaskStatus.AWAITING_APPROVAL, progress: 100, customPrompt: undefined } : t
                        );
                    } else {
                        // Task state changed while AI was working, so discard the result.
                        addLog(AgentName.MASTER_PLANNER, `Discarding generated content for "${task.title}" as it was manually completed or changed.`);
                        return currentTasks;
                    }
                });
            } else { // Logic for non-content generation tasks (e.g., logistics)
                const processingTime = 2000 + Math.random() * 3000;
                const updateInterval = 100;
                const progressSteps = processingTime / updateInterval;
                let progressIncrement = 100 / progressSteps;
    
                if (progressIntervals.current[task.id]) {
                    clearInterval(progressIntervals.current[task.id]);
                }
    
                progressIntervals.current[task.id] = setInterval(() => {
                    setTasks(prevTasks =>
                        prevTasks.map(t =>
                            t.id === task.id && t.status === TaskStatus.IN_PROGRESS
                                ? { ...t, progress: Math.min(100, (t.progress || 0) + progressIncrement) }
                                : t
                        )
                    );
                }, updateInterval);
    
                setTimeout(() => {
                    clearInterval(progressIntervals.current[task.id]);
                    delete progressIntervals.current[task.id];
                    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, progress: 100 } : t)));
                    addLog(task.assignedTo, `Task "${task.title}" work is finished. Awaiting manual completion.`);
                }, processingTime);
            }
        } catch (e) {
            const currentRetries = task.retries || 0;
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    
            if (currentRetries < MAX_TASK_RETRIES) {
                addLog(task.assignedTo, `Error on task "${task.title}": ${errorMessage}. Retrying (${currentRetries + 1}/${MAX_TASK_RETRIES}).`);
                setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, retries: currentRetries + 1, progress: 0 } : t)));
                 processingTasks.current.delete(task.id); // Release lock to allow retry
            } else {
                addLog(task.assignedTo, `Error on task "${task.title}": ${errorMessage}. Task failed after ${MAX_TASK_RETRIES} retries.`);
                setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: TaskStatus.FAILED, progress: 0 } : t)));
                setAgentStatus(prev => ({ ...prev, [task.assignedTo]: AgentStatus.ERROR }));
                setAgentWork(prev => ({ ...prev, [task.assignedTo]: null }));
                // Release lock on final failure.
                processingTasks.current.delete(task.id);
            }
        }
    }, [addLog, setTasks, setApprovals]);

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
                    if (parentUpdates.has(task.id)) {
                        const stats = parentUpdates.get(task.id)!;
                        const newProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        const allSubtasksCompleted = stats.total > 0 && stats.completed === stats.total;
                        let newStatus = task.status;
                        
                        if (allSubtasksCompleted && task.status !== TaskStatus.COMPLETED) newStatus = TaskStatus.COMPLETED;
                        else if (!allSubtasksCompleted && task.status === TaskStatus.COMPLETED) newStatus = TaskStatus.IN_PROGRESS;
                        else if (task.status === TaskStatus.PENDING) {
                            const subTasks = subTasksByParent.get(task.id) || [];
                            const isAnySubtaskReady = subTasks.some(sub => (sub.dependsOn || []).every(depId => completedTaskIds.has(depId)));
                            if (isAnySubtaskReady) newStatus = TaskStatus.IN_PROGRESS;
                        }

                        if (task.progress !== newProgress || task.status !== newStatus) {
                            hasChanged = true;
                            return { ...task, progress: newProgress, status: newStatus };
                        }
                    }
                    return task;
                });

                if (hasChanged) {
                    const originalTasksMap = new Map(currentTasks.map(t => [t.id, t]));
                    newTasks.forEach(newTask => {
                        const originalTask = originalTasksMap.get(newTask.id);
                        if(originalTask && originalTask.status !== newTask.status && parentUpdates.has(newTask.id)) {
                            if(newTask.status === TaskStatus.COMPLETED) addLog(newTask.assignedTo, `All sub-tasks for "${newTask.title}" are complete. Marking parent task as complete.`);
                            else if (originalTask.status === TaskStatus.COMPLETED) addLog(newTask.assignedTo, `A sub-task for "${newTask.title}" is no longer complete. Reverting parent task to In Progress.`);
                            else if (newTask.status === TaskStatus.IN_PROGRESS) addLog(AgentName.MASTER_PLANNER, `A sub-task for "${newTask.title}" is ready. Marking parent task as In Progress.`);
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

        const parentTaskIds = new Set(tasks.map(t => t.parentId).filter((id): id is string => !!id));
        
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
            if (agentName === AgentName.MASTER_PLANNER) return;

            const activeTasks = activeTasksByAgent[agentName];
            const isWorking = activeTasks.length > 0;
            const currentStatus = agentStatus[agentName];

            if (isWorking) {
                if (currentStatus !== AgentStatus.WORKING && currentStatus !== AgentStatus.ERROR) {
                    newAgentStatus[agentName] = AgentStatus.WORKING;
                    statusHasChanged = true;
                }
                const newWork = activeTasks[0].id;
                if (agentWork[agentName] !== newWork) {
                    newAgentWork[agentName] = newWork;
                    workHasChanged = true;
                }
            } else {
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
        
        if (statusHasChanged) setAgentStatus(newAgentStatus);
        if (workHasChanged) setAgentWork(newAgentWork);
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
        setCurrentSessionId(null);
        setSaveStatus('idle');
        processingTasks.current.clear();
        Object.values(progressIntervals.current).forEach(clearInterval);
        progressIntervals.current = {};
        
        localStorage.removeItem('festflow_tasks');
        localStorage.removeItem('festflow_approvals');
        localStorage.removeItem('festflow_logs');
        localStorage.removeItem('festflow_agentStatus');
        localStorage.removeItem('festflow_agentWork');
        localStorage.removeItem('festflow_isStarted');
        localStorage.removeItem('festflow_currentSessionId');

    }, [initialAgentStatus, initialAgentWork]);

    // Automatically reset the state if the user logs out
    useEffect(() => {
        if (!currentUser && isStarted) {
            handleReset();
        }
    }, [currentUser, isStarted, handleReset]);

    const handleGoalSubmit = useCallback(async (goal: string) => {
        if (!currentUser) {
            setError("Authentication error: You must be logged in to create a plan.");
            return;
        }
        handleReset();
        setIsLoading(true);
        setError(null);
        setIsStarted(true);

        addLog(AgentName.MASTER_PLANNER, 'Received new event goal. Starting decomposition...');
        setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.WORKING }));
        setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: "Decomposing event goal..." }));

        try {
            const decomposedTasks = await decomposeGoal(goal);
            addLog(AgentName.MASTER_PLANNER, `Successfully decomposed goal into ${decomposedTasks.length} tasks.`);
            
            const initialState: AppState = {
                tasks: decomposedTasks,
                approvals: [],
                logs: [{ agent: AgentName.MASTER_PLANNER, message: `Plan created for goal: "${goal}"`, timestamp: new Date() }],
                agentStatus: initialAgentStatus,
                agentWork: initialAgentWork,
                isStarted: true,
            };

            const newSessionId = await createSession(currentUser.uid, initialState);
            
            setTasks(initialState.tasks);
            setApprovals(initialState.approvals);
            setLogs(initialState.logs);
            setAgentStatus(initialState.agentStatus);
            setAgentWork(initialState.agentWork);
            setIsStarted(initialState.isStarted);
            setCurrentSessionId(newSessionId);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            addLog(AgentName.MASTER_PLANNER, `Error: ${errorMessage}`);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.ERROR }));
            setIsStarted(false); // Reset started state on failure
        } finally {
            setIsLoading(false);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.IDLE }));
            setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: null }));
        }
    }, [addLog, handleReset, currentUser, initialAgentStatus, initialAgentWork]);
    
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
        // A task is a parent if its ID appears in another task's `parentId` field.
        const parentTaskIds = new Set(tasks.map(t => t.parentId).filter((id): id is string => !!id));

        const tasksToProcess = tasks.filter(task => 
            !parentTaskIds.has(task.id) && // Filter out tasks that are parents
            task.status === TaskStatus.IN_PROGRESS &&
            !processingTasks.current.has(task.id) &&
            (task.progress ?? 0) < 100
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

            // Release the processing lock for this task, as a decision has been made.
            processingTasks.current.delete(approval.taskId);

            if (decision === 'approved') {
                setTasks(prev => prev.map(t => t.id === approval.taskId ? {
                    ...t, 
                    status: TaskStatus.COMPLETED, 
                    progress: 100,
                    approvedContent: newContent ?? approval.content,
                    customPrompt: undefined,
                } : t));
                addLog(relatedTask.assignedTo, `Task approved: "${relatedTask.title}". Finalizing.`);
            } else { // 'rejected'
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
             processingTasks.current.delete(taskId);
             setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: TaskStatus.COMPLETED, progress: 100} : t));
        }
    }, [tasks, addLog]);
    
    const handleReassignTask = useCallback((taskId: string, newAgent: AgentName) => {
        const taskToReassign = tasks.find(t => t.id === taskId);
        if (!taskToReassign) return;
        
        processingTasks.current.delete(taskId);
        
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

    const handleOpenLoadModal = useCallback(async () => {
        if (!currentUser) {
            setError("You must be logged in to load sessions.");
            return;
        }
        setIsLoadModalOpen(true);
        setIsLoadingSessions(true);
        setLoadSessionsError(null);
        try {
            const sessions = await getSavedSessions(currentUser.uid);
            setSavedSessions(sessions);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setLoadSessionsError(errorMessage);
        } finally {
            setIsLoadingSessions(false);
        }
    }, [currentUser]);

    const handleLoadState = useCallback(async (sessionId: string) => {
        if (!currentUser) {
            setError('Authentication error: No user is logged in.');
            return;
        }
        setIsLoadModalOpen(false);
        setIsLoading(true);
        setError(null);
        try {
            const loadedState = await loadSessionFromFirestore(currentUser.uid, sessionId);
            
            handleReset();
            
            setTimeout(() => {
                setTasks(loadedState.tasks);
                setApprovals(loadedState.approvals);
                setLogs(loadedState.logs);
                setAgentStatus(loadedState.agentStatus);
                setAgentWork(loadedState.agentWork);
                setIsStarted(loadedState.isStarted);
                setCurrentSessionId(sessionId);
                addLog(AgentName.MASTER_PLANNER, `Successfully loaded session ${sessionId.slice(0,6)}...`);
                setIsLoading(false);
            }, 100);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to load session: ${errorMessage}`);
            setIsLoading(false);
        }
    }, [handleReset, addLog, currentUser]);

    const handleConfirmReset = () => {
        handleReset();
        setIsResetModalOpen(false);
    };
    
    const handleDeleteCurrentSession = useCallback(async () => {
        if (currentUser && currentSessionId) {
            try {
                await deleteSession(currentUser.uid, currentSessionId);
                addLog(AgentName.MASTER_PLANNER, `Deleted current session ${currentSessionId.slice(0,6)}...`);
                handleReset();
            } catch (error) {
                console.error("Failed to delete current session:", error);
                setError("Failed to delete the current plan from the cloud.");
            }
        }
        setIsDeleteCurrentModalOpen(false);
    }, [currentUser, currentSessionId, addLog, handleReset]);

    const handleDeleteSession = useCallback(async (sessionId: string) => {
        if (!currentUser) {
            setLoadSessionsError("You must be logged in to delete sessions.");
            return;
        }
    
        // If deleting the currently active plan, delegate to the specific function
        // that handles both DB deletion and resetting the local state to the landing page.
        if (sessionId === currentSessionId) {
            await handleDeleteCurrentSession();
            setIsLoadModalOpen(false); // Ensure the modal is closed after the app resets
            return;
        }
    
        // If deleting any other plan, just remove it from the database and refresh the list.
        setIsLoadingSessions(true);
        setLoadSessionsError(null);
    
        try {
            await deleteSession(currentUser.uid, sessionId);
            addLog(AgentName.MASTER_PLANNER, `Deleted session ${sessionId.slice(0,6)}...`);
            
            // Re-fetch the list from the database to ensure the UI is in sync.
            const freshSessions = await getSavedSessions(currentUser.uid);
            setSavedSessions(freshSessions);
    
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setLoadSessionsError(`Failed to delete session: ${errorMessage}`);
            try {
                // Attempt to re-fetch even on error to ensure consistency
                const sessions = await getSavedSessions(currentUser.uid);
                setSavedSessions(sessions);
            } catch (fetchError) {
                 console.error("Failed to re-fetch sessions after deletion error:", fetchError);
            }
        } finally {
            setIsLoadingSessions(false);
        }
    }, [currentUser, addLog, currentSessionId, handleDeleteCurrentSession]);

    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <div className="min-h-screen bg-primary text-light flex flex-col">
            <Header 
                onResetClick={() => setIsResetModalOpen(true)}
                onDeleteCurrentClick={() => setIsDeleteCurrentModalOpen(true)}
                isPlanSaved={!!currentSessionId}
                saveStatus={isStarted ? saveStatus : 'idle'}
                onLoadClick={handleOpenLoadModal}
            />
            <main className="flex-grow p-4 md:p-8 space-y-8 flex flex-col">
                {!currentUser ? (
                    <div className="flex-grow flex items-center justify-center">
                        <LoginScreen />
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </main>
            {selectedTask && <TaskDetailModal task={selectedTask} allTasks={tasks} onClose={() => setSelectedTask(null)} onTaskUpdate={handleUpdateTask} />}
            {viewingResultTask && <ResultModal task={viewingResultTask} onClose={() => setViewingResultTask(null)} />}
            {currentUser && 
                <LoadSessionModal 
                    isOpen={isLoadModalOpen}
                    onClose={() => setIsLoadModalOpen(false)}
                    sessions={savedSessions}
                    onLoadSession={handleLoadState}
                    onDeleteSession={handleDeleteSession}
                    isLoading={isLoadingSessions}
                    error={loadSessionsError}
                />
            }
            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleConfirmReset}
                title="Confirm Reset"
                message="Are you sure you want to start a new plan? This will clear the current session from your screen. Your saved work will remain in the cloud."
                confirmText="Reset"
                confirmButtonClass="bg-highlight hover:opacity-90"
            />
             <ConfirmationModal
                isOpen={isDeleteCurrentModalOpen}
                onClose={() => setIsDeleteCurrentModalOpen(false)}
                onConfirm={handleDeleteCurrentSession}
                title="Confirm Deletion"
                message="Are you sure you want to permanently delete the current plan from the cloud? This action cannot be undone."
                confirmText="Delete Forever"
                confirmButtonClass="bg-danger hover:bg-danger/90"
            />
        </div>
    );
};

export default App;
