import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AgentName, Task, TaskStatus } from "../types";

// Set to true to use mock data and bypass the Gemini API, enabling offline use.
const IS_OFFLINE = false;

// Initialize the Google GenAI client
// The API key is expected to be set as an environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * MOCK IMPLEMENTATION FOR OFFLINE USE
 */

const mockDecomposeGoal = (goal: string): Promise<Task[]> => {
    console.log("Decomposing goal (offline mock):", goal);
    const mockPlan: Partial<Task>[] = [
        {
            id: "select-venue",
            title: "Select and Book Venue",
            description: "Research and book a suitable venue for a 3-day event for 50 people.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: [],
            estimatedDuration: 3,
        },
        {
            id: "develop-sponsorship-packages",
            title: "Develop Sponsorship Packages",
            description: "Create tiered sponsorship packages with different benefits (e.g., Gold, Silver, Bronze).",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: [],
            estimatedDuration: 2,
        },
        {
            id: "send-sponsorship-emails",
            title: "Send Initial Sponsorship Emails",
            description: "Draft and send personalized outreach emails to a pre-approved list of 10 potential sponsors.",
            assignedTo: AgentName.SPONSORSHIP_OUTREACH,
            dependsOn: ["develop-sponsorship-packages"],
            estimatedDuration: 2,
        },
        {
            id: "announce-event-social-media",
            title: "Announce Event on Social Media",
            description: "Create an engaging social media post to announce the robotics competition, including date, venue, and a call for early registration.",
            assignedTo: AgentName.MARKETING,
            dependsOn: ["select-venue"],
            estimatedDuration: 1,
        },
        {
            id: "arrange-catering",
            title: "Arrange Catering",
            description: "Oversee the entire catering arrangement process for the 3-day event.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: ["select-venue"],
            estimatedDuration: 4,
        },
        {
            id: "research-caterers",
            title: "Research Potential Caterers",
            description: "Find 5 potential caterers who can handle a 3-day event for 50 people and have good reviews.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: [],
            estimatedDuration: 1,
            parentId: "arrange-catering",
        },
        {
            id: "get-catering-quotes",
            title: "Get Catering Quotes",
            description: "Contact the researched caterers and get detailed quotes, including menus and pricing.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: ["research-caterers"],
            estimatedDuration: 2,
            parentId: "arrange-catering",
        },
        {
            id: "sign-catering-contract",
            title: "Sign Catering Contract",
            description: "Finalize the choice of caterer, review, and sign the contract.",
            assignedTo: AgentName.LOGISTICS_COORDINATOR,
            dependsOn: ["get-catering-quotes"],
            estimatedDuration: 1,
            parentId: "arrange-catering",
        }
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
    console.log(`Executing task (offline mock): "${task.title}"`);
    let mockContent = "";

    if (task.assignedTo === AgentName.MARKETING) {
        mockContent = `🚀 Get ready, innovators! FestFlow is proud to announce our 3-day Robotics Competition from Oct 1-3! 🤖 Join 50 of the brightest minds as they battle for the top spot. Venue details are confirmed! Early bird registration opens next week. Don't miss out! #Robotics #TechEvent #Competition #FestFlow`;
    } else if (task.assignedTo === AgentName.SPONSORSHIP_OUTREACH) {
        mockContent = `Subject: Partnership Opportunity: The Annual FestFlow Robotics Competition

Dear [Sponsor Name],

I am writing to invite you to partner with us for the upcoming FestFlow Robotics Competition, a 3-day event taking place from October 1st to 3rd. We are expecting 50 of the top robotics enthusiasts and significant media coverage.

We believe a partnership would offer great value to your brand. Our sponsorship packages are attached for your review.

We would be delighted to discuss this opportunity further.

Best regards,

Sponsorship Outreach Agent
FestFlow`;
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
3.  For complex tasks (e.g., "Arrange Catering"), create a main parent task and then several sub-tasks linked to it via a 'parentId'. Sub-tasks should have their own dependencies if they are sequential.
4.  Assign each task to the most appropriate agent from the list above.
5.  Define dependencies between tasks. A task's 'dependsOn' array should contain the 'id's of all tasks that must be completed before it can start. For example, a marketing post about the venue can only be created after the venue is booked.
6.  Generate a unique, URL-friendly slug for each task 'id'.
7.  Provide a realistic 'estimatedDuration' in days for each task. The duration should be a whole number greater than 0.
8.  You MUST return the plan as a JSON array of task objects matching the provided schema. Do not return markdown or any other text.`;
    
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
