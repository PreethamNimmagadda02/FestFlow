import React, { useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { AGENT_DETAILS } from '../constants';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { XCircleIcon } from './icons/XCircleIcon';

// Tailwind JIT scanning hints. These classes are constructed dynamically.
// bg-cyan-400/30 border-cyan-400
// bg-orange-400/30 border-orange-400
// bg-green-400/30 border-green-400
// bg-purple-400/30 border-purple-400

interface GanttChartProps {
    tasks: Task[];
}

interface ProcessedTask extends Task {
    start: number;
    end: number;
    level: number;
}

const statusIcons: Record<TaskStatus, React.FC<any>> = {
    [TaskStatus.COMPLETED]: CheckCircleIcon,
    [TaskStatus.PENDING]: ClockIcon,
    [TaskStatus.IN_PROGRESS]: ClockIcon,
    [TaskStatus.AWAITING_APPROVAL]: ClockIcon,
    [TaskStatus.FAILED]: XCircleIcon,
    [TaskStatus.SCHEDULED]: ClockIcon,
};


export const GanttChart: React.FC<GanttChartProps> = React.memo(({ tasks }) => {
    const { processedTasks, totalDuration } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            return { processedTasks: [], totalDuration: 0 };
        }

        const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
        const memo = new Map<string, ProcessedTask>();

        const getTaskEndAndLevel = (taskId: string): { end: number, level: number } => {
            if (memo.has(taskId)) {
                const pTask = memo.get(taskId)!;
                return { end: pTask.end, level: pTask.level };
            }

            const task = taskMap.get(taskId);
            if (!task) return { end: 0, level: 0 };

            let start = 0;
            let level = 0;
            if (task.dependsOn && task.dependsOn.length > 0) {
                const parentEnds = task.dependsOn.map(depId => {
                     const { end, level: parentLevel } = getTaskEndAndLevel(depId);
                     level = Math.max(level, parentLevel + 1);
                     return end;
                });
                start = Math.max(...parentEnds);
            }

            const duration = 1; // Assume each task takes 1 time unit
            const end = start + duration;

            memo.set(taskId, { ...task, start, end, level });
            return { end, level };
        };
        
        tasks.forEach(task => getTaskEndAndLevel(task.id));
        
        const processedTasks = Array.from(memo.values()).sort((a, b) => a.start - b.start || a.level - b.level);
        const totalDuration = Math.max(...processedTasks.map(t => t.end), 0);
        
        // Re-calculate level for vertical positioning to avoid overlaps
        const levels: {end: number}[] = [];
        processedTasks.forEach(task => {
            let placed = false;
            for (let i = 0; i < levels.length; i++) {
                if (levels[i].end <= task.start) {
                    levels[i].end = task.end;
                    task.level = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                task.level = levels.length;
                levels.push({end: task.end});
            }
        });

        return { processedTasks, totalDuration: Math.max(totalDuration, 1) };
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="bg-secondary p-8 rounded-xl text-center text-text-secondary border border-accent">
                No tasks to display in Gantt chart.
            </div>
        );
    }
    
    const rowHeight = 40;
    const rowGap = 8;
    const headerHeight = 50;
    const taskListWidth = 200;

    return (
        <div className="bg-secondary p-4 rounded-xl overflow-x-auto border border-accent">
            <div style={{ minWidth: `${totalDuration * 100 + taskListWidth}px` }}>
                <div className="flex sticky top-0 bg-secondary z-10" style={{ height: `${headerHeight}px` }}>
                    <div style={{width: `${taskListWidth}px`}} className="border-r border-accent shrink-0 font-bold text-light flex items-center p-2">Tasks</div>
                    <div className="flex-grow grid" style={{ gridTemplateColumns: `repeat(${totalDuration}, minmax(0, 1fr))` }}>
                        {Array.from({ length: totalDuration }, (_, i) => (
                            <div key={i} className="text-center text-xs text-text-secondary border-r border-accent pt-4">
                                Step {i + 1}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    {processedTasks.map((task) => {
                        const agentColor = AGENT_DETAILS[task.assignedTo]?.color || 'text-gray-400';
                        const StatusIcon = statusIcons[task.status] || ClockIcon;

                        return (
                            <div 
                                key={task.id} 
                                className="absolute flex items-center group"
                                style={{
                                    top: `${task.level * (rowHeight + rowGap) + 10}px`,
                                    left: `${taskListWidth + task.start * 100}px`,
                                    width: `${(task.end - task.start) * 100 - rowGap}px`,
                                    height: `${rowHeight}px`,
                                }}
                            >
                                <div className={`h-full w-full ${agentColor.replace('text-','bg-')}/30 rounded-lg flex items-center px-3 border-l-4 ${agentColor.replace('text-','border-')}`}>
                                    <StatusIcon className={`w-4 h-4 mr-2 shrink-0 ${agentColor}`} />
                                    <span className="text-sm font-semibold text-light truncate">{task.title}</span>
                                </div>
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary px-2 py-1 text-xs rounded-md text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
                                    {task.title}
                                </div>
                            </div>
                        );
                    })}
                </div>
                 <div style={{ height: `${Math.max(0, ...processedTasks.map(t => t.level)) * (rowHeight + rowGap) + rowHeight + 20}px` }} />
            </div>
        </div>
    );
});
