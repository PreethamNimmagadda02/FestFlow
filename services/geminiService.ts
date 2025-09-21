import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AgentName, Task, TaskStatus } from "../types";

// Set to true to use mock data and bypass the Gemini API, enabling offline use.
const IS_OFFLINE = false;

// Initialize the Google GenAI client
// The API key is expected to be set as an environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * MOCK IMPLEMENTATION FOR OFFLINE USE
 * A comprehensive mock plan to test all application features at once.
 */

const mockDecomposeGoal = (goal: string): Promise<Task[]> => {
    console.log("Decomposing goal (Comprehensive Offline Mock):", goal);
    const mockPlan: Partial<Task>[] = [
        // --- Parent Task for Logistics ---
        {
            id: "secure-logistics",
            title: "Secure Event Logistics",
            description: "Oversee all logistical arrangements including venue, AV, and catering.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: [],
            estimatedDuration: 8, // Sum of its longest sequential chain of sub-tasks
        },
        // --- Logistics Sub-tasks ---
        {
            id: "select-venue",
            title: "Select and Book Venue",
            description: "Research and book a suitable venue for a 3-day tech conference for 200 people.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: [], // No dependencies, can start immediately
            estimatedDuration: 3,
            parentId: "secure-logistics",
        },
        {
            id: "arrange-av",
            title: "Arrange AV Equipment",
            description: "Coordinate with vendors for stage, sound, and lighting.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: ["select-venue"], // Must happen after venue is booked
            estimatedDuration: 2,
            parentId: "secure-logistics",
        },
        {
            id: "arrange-catering",
            title: "Finalize Catering",
            description: "Get quotes and sign a contract for event catering.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: ["select-venue"], // Also depends on venue
            estimatedDuration: 3,
            parentId: "secure-logistics",
        },

        // --- Parent Task for Sponsorship ---
        {
            id: "manage-sponsorship",
            title: "Manage Sponsorship Campaign",
            description: "Develop sponsorship packages, conduct outreach, and secure funding.",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: [],
            estimatedDuration: 7,
        },
        // --- Sponsorship Sub-tasks ---
        {
            id: "develop-sponsorship-packages",
            title: "Develop Sponsorship Tiers",
            description: "Create tiered sponsorship packages (e.g., Platinum, Gold, Silver) with clear benefits.",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: [], // Can start immediately
            estimatedDuration: 2,
            parentId: "manage-sponsorship",
        },
        {
            id: "draft-sponsorship-email",
            title: "Draft Initial Sponsorship Email",
            description: "Draft a compelling and personalized outreach email template for potential sponsors.",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: ["develop-sponsorship-packages"], // Depends on tiers being defined
            estimatedDuration: 1, // This is a content generation task
            parentId: "manage-sponsorship",
        },
        {
            id: "send-sponsorship-emails",
            title: "Send Wave 1 Sponsorship Emails",
            description: "Send the approved email to a pre-vetted list of 20 potential sponsors.",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: ["draft-sponsorship-email"], // Depends on email being approved
            estimatedDuration: 2,
            parentId: "manage-sponsorship",
        },

        // --- Parent Task for Marketing ---
        {
            id: "execute-marketing-plan",
            title: "Execute Marketing Plan",
            description: "Oversee all marketing activities to promote the event and drive ticket sales.",
            assignedTo: AgentName.MARKETING,
            dependsOn: ["select-venue"], // Marketing needs a venue to announce
            estimatedDuration: 6,
        },
        // --- Marketing Sub-tasks ---
        {
            id: "create-brand-identity",
            title: "Create Event Brand Identity",
            description: "Develop a logo, color scheme, and overall visual identity for the conference.",
            assignedTo: AgentName.MARKETING,
            dependsOn: [], // Can be done in parallel at the start
            estimatedDuration: 3,
        },
        {
            id: "announce-event-social-media",
            title: "Create 'Save the Date' Post",
            description: "Create an engaging social media post to announce the conference, including date and venue.",
            assignedTo: AgentName.MARKETING,
            dependsOn: ["select-venue", "create-brand-identity"], // Depends on both logistics and branding
            estimatedDuration: 1, // Content generation task
            parentId: "execute-marketing-plan",
        },
        {
            id: "launch-event-website",
            title: "Launch Simple Event Website",
            description: "Build and deploy a one-page website with key event details and a sign-up form.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR, // A technical task for logistics
            dependsOn: ["create-brand-identity"],
            estimatedDuration: 4,
            parentId: "execute-marketing-plan",
        },
        {
            id: "announce-keynote-speaker",
            title: "Announce Keynote Speaker",
            description: "Create a social media campaign to announce the confirmed keynote speaker.",
            assignedTo: AgentName.MARKETING,
            dependsOn: ["launch-event-website"], // Announce after website is live
            estimatedDuration: 1, // Content generation task
            parentId: "execute-marketing-plan",
        },
    ];

    const fullTasks = mockPlan.map(task => ({
        ...task,
        status: (task.dependsOn && task.dependsOn.length > 0) ? TaskStatus.PENDING : TaskStatus.IN_PROGRESS,
        progress: 0,
        retries: 0
    } as Task));

    return new Promise(resolve => {
        setTimeout(() => {
            resolve(fullTasks);
        }, 1500); // Simulate network delay
    });
};

const mockExecuteTask = (task: Task): Promise<string> => {
    console.log(`Executing task (Comprehensive Offline Mock): "${task.title}"`);
    let mockContent = "Default mock content. If you see this, the task title might not be matched in mockExecuteTask.";

    switch (task.id) {
        case "draft-sponsorship-email":
            mockContent = `Subject: Partnership Opportunity: The Annual FestFlow Tech Conference

Dear [Sponsor Name],

I am writing to invite you to partner with us for the upcoming FestFlow Tech Conference, a premier 3-day event gathering 200 industry leaders and innovators.

We believe a partnership would offer exceptional value and exposure for your brand. Our detailed sponsorship packages are attached for your review, outlining various tiers of benefits.

We would be delighted to schedule a brief call to discuss this opportunity further.

Best regards,

Sponsorship Outreach Agent
FestFlow`;
            break;
        case "announce-event-social-media":
            mockContent = `🚀 BIG NEWS! Announcing the FestFlow Tech Conference 2024! 🤖

Join us for 3 days of innovation, networking, and groundbreaking tech.
📅 October 22-24, 2024
📍 The Grand Expo Center

Get ready to connect with 200 of the brightest minds in the industry. Early bird tickets drop next month! Don't miss out. #TechConference #Innovation #FestFlow2024 #SaveTheDate`;
            break;
        case "announce-keynote-speaker":
            mockContent = `🎤 Keynote Speaker Announcement! 🎤

We are thrilled to announce that the legendary Dr. Evelyn Reed, a pioneer in artificial intelligence, will be our keynote speaker at the FestFlow Tech Conference!

Get ready for an inspiring session on the future of AI and robotics. You won't want to miss this!

Learn more on our new website: FestFlowConf.com #Keynote #AI #TechEvent #FestFlow2024`;
            break;
    }

     return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockContent);
        }, 1000); // Simulate network delay
    });
}


/**
 * A wrapper for the Gemini API call that includes a retry mechanism
 * with exponential backoff for handling 429 rate limit errors.
 * @param generateFn The function that makes the actual API call.
 * @param maxRetries The maximum number of retries.
 * @param initialDelay The initial delay between retries in milliseconds.
 * @returns A promise that resolves with the API response.
 */
const callGeminiWithRetry = async (
    generateFn: () => Promise<GenerateContentResponse>,
    maxRetries = 3,
    initialDelay = 1000
): Promise<GenerateContentResponse> => {
    let retries = 0;
    let delay = initialDelay;
    while (true) {
        try {
            return await generateFn();
        } catch (error: any) {
            // The Gemini SDK error for 429 does not have a clean status code property.
            // We inspect the error message string as a workaround.
            if (retries < maxRetries && error.message && error.message.includes('429')) {
                retries++;
                console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            } else {
                 if (error.message && error.message.includes('429')) {
                     throw new Error(`Rate limit exceeded. Please wait a minute and try again. (Failed after ${maxRetries} retries)`);
                 }
                 // Re-throw other errors immediately
                 throw error;
            }
        }
    }
};

/**
 * Decomposes a high-level goal into a series of structured tasks using the Gemini API.
 * @param goal The user's high-level event goal.
 * @returns A promise that resolves to an array of tasks.
 */
export const decomposeGoal = async (goal: string): Promise<Task[]> => {
    if (IS_OFFLINE) {
        return mockDecomposeGoal(goal);
    }
    console.log("Decomposing goal (live):", goal);

    const systemInstruction = `You are the MasterPlannerAgent for FestFlow, an AI event orchestration platform. Your role is to decompose a high-level user goal into a detailed, structured plan of tasks.

You have a team of specialized agents to delegate tasks to:
- "${AgentName.LOGISTICS_COORDINATOR}": Handles physical and organizational tasks like booking venues, managing vendors, and creating schedules. These tasks are considered "manual" and will be marked as complete by the user.
- "${AgentName.SPONSORSHIP_OUTREACH}": Handles all communication with potential sponsors. This agent generates content (like emails) that requires user approval.
- "${AgentName.MARKETING}": Handles all promotional activities. This agent generates content (like social media posts) that requires user approval.

Your instructions are:
1.  Analyze the user's goal carefully.
2.  Break it down into a logical sequence of specific, actionable tasks.
3.  For complex tasks (e.g., "Arrange Catering"), create a main **parent task** to act as an organizational container, and then several **sub-tasks** linked to it via a 'parentId'.
4.  Crucially, when creating parent and sub-tasks, follow these rules:
    - Parent tasks are non-executable containers for organization. Their status is derived from their children.
    - A parent task's 'estimatedDuration' should be a rough sum of its sequential sub-tasks' durations.
    - **Sub-task Dependency Rule:** Sub-tasks MUST inherit all prerequisites from their parent task. Additionally, sub-tasks CAN have dependencies on other sub-tasks under the same parent to create a logical sequence.
    - **Example:** If parent "Arrange Catering" depends on "Select Venue", then its sub-task "Get Quotes" MUST also depend on "Select Venue". "Get Quotes" could ALSO depend on a sibling sub-task like "Research Caterers".
5.  Assign each task to the most appropriate agent from the list above.
6.  Define dependencies between tasks. A task's 'dependsOn' array should contain the 'id's of all tasks that must be completed before it can start. For example, a marketing post about the venue can only be created after the venue is booked.
7.  Generate a unique, URL-friendly slug for each task 'id'.
8.  Provide a realistic 'estimatedDuration' in days for each task. The duration should be a whole number greater than 0.
9.  You MUST return the plan as a JSON array of task objects matching the provided schema. Do not return markdown or any other text.`;
    
    const taskSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "A unique, URL-friendly slug for the task (e.g., 'book-venue')." },
            title: { type: Type.STRING, description: "A concise, descriptive title for the task." },
            description: { type: Type.STRING, description: "A detailed description of what the task involves." },
            assignedTo: {
                type: Type.STRING,
                description: `The agent assigned to this task. Must be one of: "${AgentName.LOGISTICS_COORDINATOR}", "${AgentName.SPONSORSHIP_OUTREACH}", "${AgentName.MARKETING}".`
            },
            dependsOn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of task IDs that must be completed before this task can start. Can be an empty array."
            },
            estimatedDuration: {
                type: Type.NUMBER,
                description: "The estimated number of days this task will take to complete (must be a whole number greater than 0)."
            },
            parentId: { 
                type: Type.STRING,
                description: "Optional. The ID of the parent task if this is a sub-task."
            },
        },
        required: ["id", "title", "description", "assignedTo", "dependsOn", "estimatedDuration"]
    };

    const schema = {
        type: Type.ARRAY,
        items: taskSchema
    };

    try {
        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: `Decompose the following goal into a task plan: "${goal}"` }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });
        });

        const jsonStr = response.text.trim();
        const decomposedTasks = JSON.parse(jsonStr) as Task[];
        
        // Post-process to enforce sub-task dependency inheritance as a safeguard
        const taskMap = new Map(decomposedTasks.map(t => [t.id, t]));
        decomposedTasks.forEach(task => {
            if (task.parentId) {
                const parent = taskMap.get(task.parentId);
                if (parent && parent.dependsOn && parent.dependsOn.length > 0) {
                    const childDeps = new Set(task.dependsOn || []);
                    parent.dependsOn.forEach(dep => childDeps.add(dep));
                    task.dependsOn = Array.from(childDeps);
                }
            }
        });

        // Post-process tasks to add app-specific state properties
        return decomposedTasks.map(task => ({
            ...task,
            status: (task.dependsOn && task.dependsOn.length > 0) ? TaskStatus.PENDING : TaskStatus.IN_PROGRESS,
            progress: 0,
            retries: 0
        }));

    } catch (e) {
        console.error("Error during goal decomposition:", e);
        if (e instanceof Error) {
            throw new Error(`Error during goal decomposition:\n${e.message}`);
        }
        throw new Error("An unknown error occurred during goal decomposition.");
    }
};

/**
 * Executes a specific content generation task using the Gemini API.
 * @param task The task to be executed.
 * @returns A promise that resolves to the generated content string.
 */
export const executeTask = async (task: Task): Promise<string> => {
    if (IS_OFFLINE) {
        return mockExecuteTask(task);
    }
    console.log(`Executing task (live): "${task.title}"`);

    let systemInstruction = "";

    if (task.assignedTo === AgentName.MARKETING) {
        systemInstruction = `You are the ${AgentName.MARKETING} for FestFlow. Your task is to generate compelling marketing content. Be creative, engaging, and align with the event's theme.`;
    } else if (task.assignedTo === AgentName.SPONSORSHIP_OUTREACH) {
        systemInstruction = `You are the ${AgentName.SPONSORSHIP_OUTREACH} agent for FestFlow. Your task is to draft professional and persuasive outreach emails to potential sponsors. Be clear, concise, and highlight the value proposition.`;
    } else {
        return Promise.reject(new Error(`Task execution failed: The agent ${task.assignedTo} does not generate approvable content.`));
    }
    
    // Use custom prompt if provided, otherwise construct from task details
    const prompt = task.customPrompt 
        ? task.customPrompt
        : `Based on the following task, please generate the required content.
    - Task Title: "${task.title}"
    - Task Description: "${task.description}"
    
    Generate only the content itself, without any additional commentary or formatting.`;

    try {
        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction,
                }
            });
        });

        return response.text;
    } catch (e) {
        console.error(`Error executing task "${task.title}":`, e);
        if (e instanceof Error) {
            throw new Error(`API error during task execution:\n${e.message}`);
        }
        throw new Error(`An unknown error occurred while executing task "${task.title}".`);
    }
};
