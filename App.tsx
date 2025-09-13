import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FestivalSetupForm } from './components/FestivalSetupForm';
import { Dashboard } from './components/Dashboard';
import { AgentName, Task, Approval, ActivityLog, AgentStatus, TaskStatus } from './types';
import { AGENT_NAMES, MAX_TASK_RETRIES } from './constants';
import { decomposeGoal, executeTask } from './services/geminiService';

const App: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [approvals, setApprovals] = useState<Approval[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<Record<AgentName, AgentStatus>>({
        [AgentName.MASTER_PLANNER]: AgentStatus.IDLE,
        [AgentName.LOGISTICS_COORDINATOR]: AgentStatus.IDLE,
        [AgentName.SPONSORSHIP_OUTREACH]: AgentStatus.IDLE,
        [AgentName.MARKETING]: AgentStatus.IDLE,
    });
    const [agentWork, setAgentWork] = useState<Record<AgentName, string | null>>({
        [AgentName.MASTER_PLANNER]: null,
        [AgentName.LOGISTICS_COORDINATOR]: null,
        [AgentName.SPONSORSHIP_OUTREACH]: null,
        [AgentName.MARKETING]: null,
    });
    const [isStarted, setIsStarted] = useState<boolean>(false);
    const progressIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
    const processingTasks = useRef<Set<string>>(new Set());
    
    const addLog = useCallback((agent: AgentName, message: string) => {
        setLogs(prev => [...prev, { agent, message, timestamp: new Date() }]);
    }, []);

    const handleGoalSubmit = useCallback(async (goal: string) => {
        setIsLoading(true);
        setError(null);
        setTasks([]);
        setApprovals([]);
        setLogs([]);
        setIsStarted(true);

        const initialAgentStatus = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: AgentStatus.IDLE}), {} as Record<AgentName, AgentStatus>);
        setAgentStatus(initialAgentStatus);
        const initialAgentWork = AGENT_NAMES.reduce((acc, name) => ({...acc, [name]: null}), {} as Record<AgentName, string | null>);
        setAgentWork(initialAgentWork);


        addLog(AgentName.MASTER_PLANNER, 'Received new festival goal. Starting decomposition...');
        setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.WORKING }));
        setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: "Decomposing festival goal..." }));

        try {
            const decomposedTasks = await decomposeGoal(goal);
            addLog(AgentName.MASTER_PLANNER, `Successfully decomposed goal into ${decomposedTasks.length} tasks.`);
            setTasks(decomposedTasks);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to decompose goal: ${errorMessage}`);
            addLog(AgentName.MASTER_PLANNER, `Error: ${errorMessage}`);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.ERROR }));
        } finally {
            setIsLoading(false);
            setAgentStatus(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: AgentStatus.IDLE }));
            setAgentWork(prev => ({ ...prev, [AgentName.MASTER_PLANNER]: null }));
        }
    }, [addLog]);

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
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: TaskStatus.AWAITING_APPROVAL, progress: 100} : t));

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
                
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, progress: 100} : t));
                addLog(task.assignedTo, `Work complete for "${task.title}". Ready for user to mark as complete.`);
                setAgentStatus(prev => ({...prev, [task.assignedTo]: AgentStatus.IDLE}));
                setAgentWork(prev => ({...prev, [task.assignedTo]: null}));
                processingTasks.current.delete(task.id);
            }, processingTime);
        }

    }, [addLog]);


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

    const handleApproval = useCallback((approvalId: string, decision: 'approved' | 'rejected', newContent?: string) => {
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
                    approvedContent: newContent ?? approval.content
                } : t));
                addLog(relatedTask.assignedTo, `Task approved: "${relatedTask.title}". Finalizing.`);
            } else {
                 setTasks(prev => prev.map(t => t.id === approval.taskId ? {...t, status: TaskStatus.IN_PROGRESS, progress: 0, retries: 0} : t));
                 addLog(relatedTask.assignedTo, `Task rejected: "${relatedTask.title}". Will attempt to regenerate.`);
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
        
        // Reset the old agent's status from ERROR to IDLE
        setAgentStatus(prev => ({...prev, [oldAgent]: AgentStatus.IDLE}));

        // Reassign the task and reset its state
        setTasks(prev => prev.map(t => 
            t.id === taskId 
            ? { ...t, assignedTo: newAgent, status: TaskStatus.IN_PROGRESS, progress: 0, retries: 0 } 
            : t
        ));
    }, [tasks, addLog]);


    return (
        <div className="min-h-screen bg-primary text-light flex flex-col">
            <Header />
            <main className="flex-grow p-4 md:p-8 space-y-8">
                <FestivalSetupForm onSubmit={handleGoalSubmit} isLoading={isLoading} />
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
                    />
                )}
            </main>
        </div>
    );
};

export default App;