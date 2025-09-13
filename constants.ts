import { AgentName, TaskStatus, AgentStatus } from './types';
import React from 'react';
import { RobotIcon } from './components/icons/RobotIcon';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { DollarSignIcon } from './components/icons/DollarSignIcon';
import { MegaphoneIcon } from './components/icons/MegaphoneIcon';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { ClockIcon } from './components/icons/ClockIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { PauseCircleIcon } from './components/icons/PauseCircleIcon';
import { CogIcon } from './components/icons/CogIcon';

export const MAX_TASK_RETRIES = 3;

export const AGENT_NAMES: AgentName[] = [
    AgentName.MASTER_PLANNER,
    AgentName.LOGISTICS_COORDINATOR,
    AgentName.SPONSORSHIP_OUTREACH,
    AgentName.MARKETING,
];

export const AGENT_DETAILS: Record<AgentName, { icon: React.FC<any>, color: string, description: string }> = {
    [AgentName.MASTER_PLANNER]: {
        icon: RobotIcon,
        color: 'text-cyan-400',
        description: 'Project manager. Decomposes goals into tasks.'
    },
    [AgentName.LOGISTICS_COORDINATOR]: {
        icon: CalendarIcon,
        color: 'text-orange-400',
        description: 'Manages venues, resources, and scheduling.'
    },
    [AgentName.SPONSORSHIP_OUTREACH]: {
        icon: DollarSignIcon,
        color: 'text-green-400',
        description: 'Identifies and contacts potential sponsors.'
    },
    [AgentName.MARKETING]: {
        icon: MegaphoneIcon,
        color: 'text-purple-400',
        description: 'Generates promotional content for social media.'
    }
};

export const AGENT_STATUS_STYLES: Record<AgentStatus, { color: string, icon: React.FC<any> | null }> = {
    [AgentStatus.IDLE]: {
        color: 'text-text-secondary',
        icon: PauseCircleIcon,
    },
    [AgentStatus.WORKING]: {
        color: 'text-green-400',
        icon: CogIcon,
    },
    [AgentStatus.ERROR]: {
        color: 'text-red-400',
        icon: XCircleIcon,
    }
};

export const TASK_STATUS_STYLES: Record<TaskStatus | 'Retrying', { icon: React.FC<any>, color: string, bgColor: string }> = {
    [TaskStatus.PENDING]: {
        icon: ClockIcon,
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-800/30'
    },
    [TaskStatus.IN_PROGRESS]: {
        icon: ClockIcon,
        color: 'text-blue-300',
        bgColor: 'bg-blue-800/30'
    },
    ['Retrying']: {
        icon: ClockIcon,
        color: 'text-orange-300',
        bgColor: 'bg-orange-800/30'
    },
    [TaskStatus.AWAITING_APPROVAL]: {
        icon: ClockIcon,
        color: 'text-purple-300',
        bgColor: 'bg-purple-800/30'
    },
    [TaskStatus.SCHEDULED]: {
        icon: CalendarIcon,
        color: 'text-purple-300',
        bgColor: 'bg-purple-800/30'
    },
    [TaskStatus.COMPLETED]: {
        icon: CheckCircleIcon,
        color: 'text-green-300',
        bgColor: 'bg-green-800/30'
    },
    [TaskStatus.FAILED]: {
        icon: XCircleIcon,
        color: 'text-red-300',
        bgColor: 'bg-red-800/30'
    }
};