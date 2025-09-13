import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AgentName, Task, TaskStatus } from "../types";

// Initialize the Google GenAI client
// The API key is expected to be set as an environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
    console.log("Decomposing goal (live):", goal);

    const systemInstruction = `You are the MasterPlannerAgent for FestFlow, an AI event orchestration platform. Your role is to decompose a high-level user goal into a detailed, structured plan of tasks.

You have a team of specialized agents to delegate tasks to:
- "${AgentName.LOGISTICS_COORDINATOR}": Handles physical and organizational tasks like booking venues, managing vendors, and creating schedules. These tasks are considered "manual" and will be marked as complete by the user.
- "${AgentName.SPONSORSHIP_OUTREACH}": Handles all communication with potential sponsors. This agent generates content (like emails) that requires user approval.
- "${AgentName.MARKETING}": Handles all promotional activities. This agent generates content (like social media posts) that requires user approval.

Your instructions are:
1.  Analyze the user's goal carefully.
2.  Break it down into a logical sequence of specific, actionable tasks.
3.  Assign each task to the most appropriate agent from the list above.
4.  Define dependencies between tasks. A task's 'dependsOn' array should contain the 'id's of all tasks that must be completed before it can start. For example, a marketing post about the venue can only be created after the venue is booked.
5.  Generate a unique, URL-friendly slug for each task 'id'.
6.  You MUST return the plan as a JSON array of task objects matching the provided schema. Do not return markdown or any other text.`;
    
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
            }
        },
        required: ["id", "title", "description", "assignedTo", "dependsOn"]
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
    console.log(`Executing task (live): "${task.title}"`);

    let systemInstruction = "";

    if (task.assignedTo === AgentName.MARKETING) {
        systemInstruction = `You are the ${AgentName.MARKETING} for FestFlow. Your task is to generate compelling marketing content. Be creative, engaging, and align with the event's theme.`;
    } else if (task.assignedTo === AgentName.SPONSORSHIP_OUTREACH) {
        systemInstruction = `You are the ${AgentName.SPONSORSHIP_OUTREACH} agent for FestFlow. Your task is to draft professional and persuasive outreach emails to potential sponsors. Be clear, concise, and highlight the value proposition.`;
    } else {
        return Promise.reject(new Error(`Task execution failed: The agent ${task.assignedTo} does not generate approvable content.`));
    }
    
    const prompt = `Based on the following task, please generate the required content.
    - Task Title: "${task.title}"
    - Task Description: "${task.description}"
    
    Generate only the content itself, without any additional commentary or formatting.`;

    try {
        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: 'gem-2.5-flash',
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