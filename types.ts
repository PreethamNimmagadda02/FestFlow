export enum AgentName {
    MASTER_PLANNER = "MasterPlannerAgent",
    LOGISTICS_COORDINATOR = "LogisticsCoordinatorAgent",
    SPONSORSHIP_OUTREACH = "SponsorshipOutreachAgent",
    MARKETING = "MarketingAgent",
}

export enum TaskStatus {
    PENDING = "Pending",
    IN_PROGRESS = "In Progress",
    AWAITING_APPROVAL = "Awaiting Approval",
    SCHEDULED = "Scheduled",
    COMPLETED = "Completed",
    FAILED = "Failed",
}

export enum AgentStatus {
    IDLE = "Idle",
    WORKING = "Working",
    ERROR = "Error",
}

export interface Task {
    id: string;
    title: string;
    description: string;
    assignedTo: AgentName;
    status: TaskStatus;
    progress?: number;
    approvedContent?: string;
    retries?: number;
    dependsOn?: string[];
    customPrompt?: string;
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
    timestamp: Date;
    agent: AgentName;
    message: string;
}