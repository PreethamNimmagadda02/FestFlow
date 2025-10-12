import { Timestamp } from 'firebase/firestore';

// Fix: Define and export all necessary enums and interfaces for the application.
// This file should only contain type definitions.

export enum AgentName {
    MASTER_PLANNER = 'Master Planner',
    LOGISTICS_COORDINATOR = 'Logistics Coordinator',
    SPONSORSHIP_OUTREACH = 'Sponsorship Outreach',
    MARKETING = 'Marketing',
}

export enum TaskStatus {
    PENDING = 'Pending',
    IN_PROGRESS = 'In Progress',
    AWAITING_APPROVAL = 'Awaiting Approval',
    SCHEDULED = 'Scheduled',
    COMPLETED = 'Completed',
    FAILED = 'Failed',
}

export enum AgentStatus {
    IDLE = 'Idle',
    WORKING = 'Working',
    ERROR = 'Error',
}

export interface FileAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string; // Firebase Storage download URL
}

export interface Task {
    id:string;
    title: string;
    description: string;
    assignedTo: AgentName;
    dependsOn?: string[];
    estimatedDuration?: number;
    status: TaskStatus;
    progress: number;
    retries: number;
    approvedContent?: string;
    customPrompt?: string;
    startDate?: string;
    parentId?: string;
    attachments?: FileAttachment[];
}

export interface Approval {
    id: string;
    taskId: string;
    agent: AgentName;
    title: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ActivityLog {
    agent: AgentName;
    message: string;
    timestamp: Date;
}

export interface AppState {
    tasks: Task[];
    approvals: Approval[];
    logs: ActivityLog[];
    agentStatus: Record<AgentName, AgentStatus>;
    agentWork: Record<AgentName, string | null>;
    isStarted: boolean;
}

export interface SavedSession {
    id: string;
    name: string;
    timestamp: Date;
    taskCount: number;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    institution?: string;
    city?: string;
    state?: string;
    pincode?: string;
}
