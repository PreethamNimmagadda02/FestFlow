import { AgentName, Task, TaskStatus } from "../types";

// --- API related code has been removed to force offline/dummy data mode ---
// This avoids API quota issues and allows for offline development.
// To re-enable API calls, restore the API key handling, GoogleGenAI client,
// and the try/catch blocks in `decomposeGoal` and `executeTask`.

export const decomposeGoal = async (goal: string): Promise<Task[]> => {
    // Forcing dummy data to avoid API quota issues.
    console.log(`Forcing offline mode for goal: "${goal}". Using dummy data for task decomposition.`);
    return getDummyTasks(goal);
};

const getDummyTasks = (goal: string): Promise<Task[]> => {
    // Simulate a more detailed decomposition based on the goal.
    // This mimics the effect of an improved system prompt for the MasterPlannerAgent.
    const dummyTasks: Omit<Task, 'progress' | 'id' | 'retries'>[] = [
        { 
            title: 'Book Event Venue', 
            description: `Book a suitable venue. Ensure it's available for the event dates and can accommodate the number of people mentioned in the goal: "${goal}"`, 
            assignedTo: AgentName.LOGISTICS_COORDINATOR, 
            status: TaskStatus.IN_PROGRESS 
        },
        { 
            title: 'Identify Potential Sponsors', 
            description: `Research and create a list of potential sponsors. The objective is to meet the sponsorship target outlined in the goal: "${goal}"`, 
            assignedTo: AgentName.SPONSORSHIP_OUTREACH, 
            status: TaskStatus.IN_PROGRESS 
        },
        { 
            title: 'Draft Announcement Post', 
            description: `Create an exciting announcement post for social media. Must include key details from the goal such as event type, dates, and participant numbers. Goal: "${goal}"`, 
            assignedTo: AgentName.MARKETING, 
            status: TaskStatus.IN_PROGRESS 
        },
        { 
            title: 'Arrange A/V Equipment', 
            description: `Ensure necessary audio/visual equipment is available for the event, scaled to the number of participants mentioned in the goal: "${goal}"`, 
            assignedTo: AgentName.LOGISTICS_COORDINATOR, 
            status: TaskStatus.IN_PROGRESS 
        },
        { 
            title: 'Draft Initial Sponsor Email', 
            description: `Write a compelling email template for sponsor outreach, referencing the specific event details from the main goal: "${goal}"`, 
            assignedTo: AgentName.SPONSORSHIP_OUTREACH, 
            status: TaskStatus.IN_PROGRESS 
        },
    ];
    // Generate unique IDs for each task to prevent issues on regeneration.
    return new Promise(resolve => setTimeout(() => resolve(dummyTasks.map((t, index) => ({
        ...t, 
        id: `task-${Date.now()}-${index}`, 
        progress: 0,
        retries: 0,
    }))), 1500));
}


export const executeTask = async (task: Task): Promise<string> => {
    // Forcing dummy data to avoid API quota issues.
    console.log(`Forcing offline mode for task: "${task.title}".`);
    // Simulate a potential failure for testing the retry mechanism
    if (task.title.includes('Sponsor') && (task.retries || 0) < 1) {
         return Promise.reject(new Error("Simulated API Error: Failed to generate content."));
    }
    return getDummyContent(task);
}

const getDummyContent = (task: Task): Promise<string> => {
    let content = "";
    if (task.assignedTo === AgentName.MARKETING) {
        content = `🚀 Get ready for the biggest event of the year! 🚀

We are thrilled to announce our 3-day Robotics Competition from Oct 1-3. 
Witness the future of tech as 50 teams battle it out for the top prize!

#RoboFest2024 #TechCompetition #Innovation`;
    } else if (task.assignedTo === AgentName.SPONSORSHIP_OUTREACH) {
        content = `Subject: Partnership Opportunity: Annual Robotics Competition 2024

Dear [Sponsor Name],

I hope this email finds you well.

My name is [Your Name], and I am part of the organizing team for the annual college robotics competition, a premier event that brings together 50 of the brightest student teams from across the region.

We are seeking partners to help make this year's event, held from October 1-3, our most successful yet. Sponsoring our event offers a unique opportunity to connect with emerging tech talent and showcase your brand's commitment to innovation.

Would you be open to a brief call next week to discuss potential sponsorship packages?

Best regards,
[Your Name]
Sponsorship Outreach Team`;
    }
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve(content), 2000));
}