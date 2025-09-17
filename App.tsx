import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EventSetupForm } from './components/FestivalSetupForm';
import { Dashboard } from './components/Dashboard';
import { AgentName, Task, Approval, ActivityLog, AgentStatus, TaskStatus } from './types';
import { AGENT_NAMES, MAX_TASK_RETRIES, AGENT_DETAILS, TASK_STATUS_STYLES } from './constants';
import { decomposeGoal, executeTask } from './services/geminiService';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { ClockIcon } from './components/icons/ClockIcon';

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
                    {task.estimatedDuration && (
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Estimated Duration</h4>
                            <div className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full bg-accent/50 text-light">
                                <ClockIcon className="w-4 h-4 mr-2" />
                                {task.estimatedDuration} day{task.estimatedDuration > 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
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

    // Sync selected task with the main tasks list to reflect updates from Gantt chart
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
        
        // Use a functional update to ensure isStarted is set after other state resets
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
        if (processingTasks.current.has(task.id)) return;
        
        processingTasks.current.add(task.id);
        setAgentStatus(prev => ({...prev, [task.assignedTo]: AgentStatus.WORKING}));
        setAgentWork(prev => ({...prev, [task.assignedTo]: task.title}));
        addLog(task.assignedTo, `Starting task: "${task.title}"`);
        
        const isContentGenerationTask = task.assignedTo === AgentName.SPONSORSHIP_OUTREACH || task.assignedTo === AgentName.MARKETING;

        if (isContentGenerationTask) {
             try {
                addLog(task.assignedTo, `Generating content for "${task.title}"...`);
                const content = await executeTask(task);
                setApprovals(prev => [...prev, {
                    id: `approval-${task.id}`,
                    taskId: task.id,
                    agent: task.assignedTo,
                    title: `Approval for: ${task.title}`,
                    content: content,
                    status: 'pending'
                }]);
                addLog(task.assignedTo, `Task "${task.title}" requires approval.`);
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: TaskStatus.AWAITING_APPROVAL, progress: 100, customPrompt: undefined} : t));

             } catch(e) {
                const currentRetries = task.retries || 0;
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';

                if (currentRetries < MAX_TASK_RETRIES) {
                     addLog(task.assignedTo, `Error on task "${task.title}": ${errorMessage}. Retrying (${currentRetries + 1}/${MAX_TASK_RETRIES}).`);
                     setTasks(prev => prev.map(t => t.id === task.id ? {...t, retries: currentRetries + 1, progress: 0} : t));
                     setAgentStatus(prev => ({...prev, [task.assignedTo]: AgentStatus.IDLE}));
                     setAgentWork(prev => ({...prev, [task.assignedTo]: null}));
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
            const progressIncrement = 100 / progressSteps;

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
                
                // Task work is finished, but it now waits for the user to manually mark it as complete.
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, progress: 100} : t));
                addLog(task.assignedTo, `Task "${task.title}" work is finished. Awaiting manual completion.`);
                setAgentStatus(prev => ({...prev, [task.assignedTo]: AgentStatus.IDLE}));
                setAgentWork(prev => ({...prev, [task.assignedTo]: null}));
                processingTasks.current.delete(task.id);
            }, processingTime);
        }

    }, [addLog]);

    useEffect(() => {
        const completedTaskIds = new Set(tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.id));
        
        // Tasks that have an absolute start date do not need to wait for dependencies
        const tasksToStart = tasks.filter(task => 
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
        const agentsToUpdate: Partial<Record<AgentName, AgentStatus>> = {};
        const workToUpdate: Partial<Record<AgentName, string | null>> = {};

        const workingAgents = (Object.keys(agentStatus) as AgentName[]).filter(
            agentName => agentStatus[agentName] === AgentStatus.WORKING
        );

        for (const agentName of workingAgents) {
             if (agentName === AgentName.MASTER_PLANNER) continue;

            const hasInProgressTasks = tasks.some(
                t => t.assignedTo === agentName && t.status === TaskStatus.IN_PROGRESS
            );
            
            const hasAwaitingApprovalTasks = approvals.some(
                a => a.agent === agentName && a.status === 'pending'
            );

            if (!hasInProgressTasks && hasAwaitingApprovalTasks) {
                addLog(agentName, `Submitted work for review. Returning to idle state.`);
                agentsToUpdate[agentName] = AgentStatus.IDLE;
                workToUpdate[agentName] = null;
            }
        }
        
        if (Object.keys(agentsToUpdate).length > 0) {
            setAgentStatus(prev => ({ ...prev, ...agentsToUpdate }));
            setAgentWork(prev => ({ ...prev, ...workToUpdate }));
        }
    }, [tasks, agentStatus, addLog, approvals]);

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
            setAgentStatus(prev => ({...prev, [relatedTask.assignedTo]: AgentStatus.IDLE}));
            setAgentWork(prev => ({...prev, [relatedTask.assignedTo]: null}));

            if (decision === 'approved') {
                setTasks(prev => prev.map(t => t.id === approval.taskId ? {
                    ...t, 
                    status: TaskStatus.COMPLETED, 
                    progress: 100,
                    approvedContent: newContent ?? approval.content,
                    customPrompt: undefined, // Clear custom prompt on approval
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
                    customPrompt: customPrompt, // Set custom prompt for regeneration
                    approvedContent: undefined // Clear previous content
                } : t));
                 addLog(relatedTask.assignedTo, logMessage);
            }
        }
    }, [approvals, tasks, addLog]);

    const handleCompleteTask = useCallback((taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
             addLog(AgentName.MASTER_PLANNER, `User marked task "${task.title}" as complete.`);
             setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: TaskStatus.COMPLETED} : t));
        }
    }, [tasks, addLog]);
    
    const handleReassignTask = useCallback((taskId: string, newAgent: AgentName) => {
        const taskToReassign = tasks.find(t => t.id === taskId);
        if (!taskToReassign) return;
        
        const oldAgent = taskToReassign.assignedTo;
        
        addLog(newAgent, `Task "${taskToReassign.title}" has been reassigned to me. Resetting and starting work.`);
        
        setAgentStatus(prev => ({...prev, [oldAgent]: AgentStatus.IDLE}));

        setTasks(prev => prev.map(t => 
            t.id === taskId 
            ? { ...t, assignedTo: newAgent, status: TaskStatus.IN_PROGRESS, progress: 0, retries: 0 } 
            : t
        ));
    }, [tasks, addLog]);

    const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
        const updatedTask = tasks.find(t => t.id === taskId);
        if (updatedTask) {
             addLog(AgentName.MASTER_PLANNER, `Task "${updatedTask.title}" was rescheduled via the timeline.`);
        }
    }, [tasks, addLog]);
    
    const handleGanttSaveChanges = useCallback((orderedTasks: Task[]) => {
        addLog(AgentName.MASTER_PLANNER, "Timeline saved. Resetting all tasks and clearing previous results to start the new plan from a clean slate.");

        // The Gantt component has determined the new task order, dependencies, and start dates.
        // We trust this new structure completely.
        // We reset all execution state to kick off the new plan from scratch.
        const newPlanTasks = orderedTasks.map(task => ({
            ...task,
            status: TaskStatus.PENDING,
            progress: 0,
            retries: 0,
            approvedContent: undefined, // Clear any previous results
        }));

        setTasks(newPlanTasks);
        // Also clear any pending approvals from the old plan, as they are now invalid.
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
                        onTaskUpdate={handleTaskUpdate}
                        onGanttSaveChanges={handleGanttSaveChanges}
                    />
                )}
            </main>
            {selectedTask && <TaskDetailModal task={selectedTask} allTasks={tasks} onClose={() => setSelectedTask(null)} />}
            {viewingResultTask && <ResultModal task={viewingResultTask} onClose={() => setViewingResultTask(null)} />}
        </div>
    );
};

export default App;
