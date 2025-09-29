import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AgentName, Task, TaskStatus, UserProfile } from "../types";

// Set to false to use the live Gemini API. Set to true for mock data and offline use.
const IS_OFFLINE = false;

// Lazy-initialize the Google GenAI client to prevent crashes if the API key is
// not present in an environment where the API is not being used (e.g., offline mode).
let ai: GoogleGenAI | null = null;

// The type for the structured response from the institution details endpoint.
interface InstitutionDetails {
    city: string;
    state: string;
    pincode: string;
}

// The type for the autocomplete suggestions response.
type InstitutionSuggestions = string[];


const getAI = (): GoogleGenAI => {
    if (!ai) {
        // The API key is expected to be set as an environment variable.
        // This constructor will only be called when IS_OFFLINE is false.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
};

/**
 * MOCK IMPLEMENTATION FOR OFFLINE USE
 * A comprehensive mock plan to test all application features at once.
 */

const mockDecomposeGoal = (goal: string, userProfile: UserProfile | null): Promise<Task[]> => {
    console.log("Decomposing goal (Comprehensive Offline Mock):", goal, "for", userProfile?.institution);
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

const mockExecuteTask = (task: Task, userProfile: UserProfile | null, projectName: string | null): Promise<string> => {
    console.log(`Executing task (Comprehensive Offline Mock): "${task.title}" for event "${projectName}" by`, userProfile?.institution);
    let mockContent = "Default mock content. If you see this, the task title might not be matched in mockExecuteTask.";
    
    const eventName = projectName || task.title; // Fallback to task title if project name is missing
    const institutionName = userProfile?.institution || 'Our Institution';
    const institutionHandle = institutionName.replace(/\s+/g, '');
    const eventHandle = (projectName || 'TheEvent').replace(/[^a-zA-Z0-9]/g, '');

    switch (task.id) {
        case "draft-sponsorship-email":
            mockContent = `Subject: Partnership Opportunity: ${eventName}

Dear [Sponsor Name],

I am writing to invite you to partner with us for the upcoming ${eventName}, a premier 3-day event organized by ${institutionName} gathering 200 industry leaders and innovators.

We believe a partnership would offer exceptional value and exposure for your brand. Our detailed sponsorship packages are attached for your review, outlining various tiers of benefits.

We would be delighted to schedule a brief call to discuss this opportunity further.

Best regards,

Sponsorship Outreach Agent
${institutionName}`;
            break;
        case "announce-event-social-media":
            mockContent = `🚀 BIG NEWS! Announcing ${eventName}! 🤖

Join us for 3 days of innovation, networking, and groundbreaking tech.
📅 October 22-24, 2024
📍 The Grand Expo Center

Get ready to connect with 200 of the brightest minds in the industry. Early bird tickets drop next month! Don't miss out. #${eventHandle} #Innovation #${institutionHandle}2024 #SaveTheDate`;
            break;
        case "announce-keynote-speaker":
            mockContent = `🎤 Keynote Speaker Announcement! 🎤

We are thrilled to announce that the legendary Dr. Evelyn Reed, a pioneer in artificial intelligence, will be our keynote speaker at ${eventName}!

Get ready for an inspiring session on the future of AI and robotics. You won't want to miss this!

Learn more on our new website: ${eventHandle}Conf.com #Keynote #AI #TechEvent #${eventHandle}2024`;
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
 * @param userProfile The user's profile, containing institution details for context.
 * @returns A promise that resolves to an array of tasks.
 */
export const decomposeGoal = async (goal: string, userProfile: UserProfile | null): Promise<Task[]> => {
    if (IS_OFFLINE) {
        return mockDecomposeGoal(goal, userProfile);
    }
    console.log("Decomposing goal (live):", goal);

    let systemInstruction = `You are the MasterPlannerAgent for an AI event orchestration platform. Your role is to decompose a high-level user goal into a detailed, structured plan of tasks.

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
    
     if (userProfile && userProfile.institution) {
        let context = `\n\nIMPORTANT CONTEXT: The user planning this event is from "${userProfile.institution}"`;
        if (userProfile.city && userProfile.state) {
            context += `, located in ${userProfile.city}, ${userProfile.state}.`;
        }
        context += " Use this information to create a more relevant and personalized plan. For example, suggest tasks that leverage local resources, mention local sponsorship opportunities, or align with the typical activities of such an institution (e.g., student-run events for a college, professional networking for a corporation).";
        systemInstruction += context;
    }

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
            return await getAI().models.generateContent({
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

const mockGetInstitutionDetails = (institutionName: string): Promise<InstitutionDetails> => {
    console.log(`Getting details for institution (Offline Mock): "${institutionName}"`);
    let details: InstitutionDetails = {
        city: 'Mountain View',
        state: 'California',
        pincode: '94043'
    };

    if (institutionName.toLowerCase().includes('mit') || institutionName.toLowerCase().includes('massachusetts institute of technology')) {
        details = {
            city: 'Cambridge',
            state: 'Massachusetts',
            pincode: '02139'
        };
    } else if (institutionName.toLowerCase().includes('stanford')) {
        details = {
            city: 'Stanford',
            state: 'California',
            pincode: '94305'
        };
    }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve(details);
        }, 800);
    });
};

export const getInstitutionDetails = async (institutionName: string): Promise<InstitutionDetails> => {
    if (IS_OFFLINE) {
        return mockGetInstitutionDetails(institutionName);
    }
    console.log("Getting institution details (live):", institutionName);

    // Refined instruction to ensure only the city name is returned.
    const systemInstruction = `You are an assistant that provides location information for educational or corporate institutions. Based on the provided institution name, you must return its official city name, state/province, and pincode/zip code in JSON format. The 'city' field should contain only the official city name, excluding any neighborhoods, districts, or specific localities. If you cannot find the exact information, make the best guess or state that it could not be found within the JSON fields.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            city: { 
                type: Type.STRING, 
                // Refined description for clarity.
                description: "The official city name where the institution is located. Exclude any neighborhoods, districts, or specific localities." 
            },
            state: { type: Type.STRING, description: "The state, province, or region where the institution is located." },
            pincode: { type: Type.STRING, description: "The pincode or ZIP code for the institution's address." },
        },
        required: ["city", "state", "pincode"]
    };

    try {
        const response = await callGeminiWithRetry(async () => {
            return await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: `Find location details for: "${institutionName}"` }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as InstitutionDetails;
    } catch (e) {
        console.error("Error getting institution details:", e);
        if (e instanceof Error) {
            throw new Error(`Error getting institution details:\n${e.message}`);
        }
        throw new Error("An unknown error occurred while fetching institution details.");
    }
};

const mockGetInstitutionSuggestions = (query: string): Promise<InstitutionSuggestions> => {
    console.log(`Getting suggestions for (Offline Mock): "${query}"`);
    const allMocks = [
        "Stanford University",
        "Stanly Community College",
        "Massachusetts Institute of Technology",
        "Michigan State University",
        "University of California, Berkeley",
        "University of Cambridge",
        "University of Michigan",
    ];
    const lowercasedQuery = query.toLowerCase();
    const filtered = allMocks.filter(name => name.toLowerCase().includes(lowercasedQuery));
    return new Promise(resolve => setTimeout(() => resolve(filtered), 300));
};

export const getInstitutionSuggestions = async (query: string): Promise<InstitutionSuggestions> => {
    if (IS_OFFLINE) {
        return mockGetInstitutionSuggestions(query);
    }
    console.log("Getting institution suggestions (live):", query);

    const systemInstruction = `You are a highly accurate autocomplete service for educational institutions. Given a partial name, return a JSON array of up to 5 suggestions. Give strong priority to institutions located in India. The suggestions must be the standard, official full names of universities, colleges, or major academic institutions. Do not include departments, sub-schools, or street addresses. For example, if the query is "IIT", you should suggest "Indian Institute of Technology Bombay", "Indian Institute of Technology Delhi", etc. Prioritize well-known institutions. Only return the JSON array.`;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING,
            description: "The full name of a suggested institution.",
        },
    };

    try {
        const response = await callGeminiWithRetry(async () => {
            return await getAI().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: `Provide autocomplete suggestions for: "${query}"` }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as InstitutionSuggestions;

    } catch (e) {
        console.error("Error getting institution suggestions:", e);
        if (e instanceof Error) {
            throw new Error(`Error getting institution suggestions:\n${e.message}`);
        }
        throw new Error("An unknown error occurred while fetching institution suggestions.");
    }
};


/**
 * Executes a specific content generation task using the Gemini API.
 * @param task The task to be executed.
 * @param userProfile The user's profile, containing institution details for personalization.
 * @param projectName The name of the event, derived from the user's initial goal.
 * @returns A promise that resolves to the generated content string.
 */
export const executeTask = async (task: Task, userProfile: UserProfile | null, projectName: string | null): Promise<string> => {
    if (IS_OFFLINE) {
        return mockExecuteTask(task, userProfile, projectName);
    }
    console.log(`Executing task (live): "${task.title}"`);

    let systemInstruction = "";

    if (task.assignedTo === AgentName.MARKETING) {
        systemInstruction = `You are the ${AgentName.MARKETING}. Your task is to generate compelling marketing content. Be creative, engaging, and align with the event's theme.`;
    } else if (task.assignedTo === AgentName.SPONSORSHIP_OUTREACH) {
        systemInstruction = `You are the ${AgentName.SPONSORSHIP_OUTREACH} agent. Your task is to draft professional and persuasive outreach emails to potential sponsors. Be clear, concise, and highlight the value proposition.`;
    } else {
        return Promise.reject(new Error(`Task execution failed: The agent ${task.assignedTo} does not generate approvable content.`));
    }
    
    let context = `\n\nIMPORTANT CONTEXT: You are generating content for an event named "${projectName || 'the event'}".`;
    
    if (userProfile && userProfile.institution) {
        context += ` This event is being organized by "${userProfile.institution}"`;
        if (userProfile.city && userProfile.state) {
            context += ` which is based in ${userProfile.city}, ${userProfile.state}.`;
        }
        context += ` Personalize the content to reflect this. Mention the institution's name, reference local culture if appropriate, and adopt a tone suitable for the institution (e.g., academic and vibrant for a college, professional and formal for a corporation).`;
    }
    systemInstruction += context;
    
    // Use custom prompt if provided, otherwise construct from task details
    const prompt = task.customPrompt 
        ? task.customPrompt
        : `Generate content based on the following task:
    - Task Title: "${task.title}"
    - Task Description: "${task.description}"
    
    Generate only the content itself, without any additional commentary or formatting.`;

    try {
        const response = await callGeminiWithRetry(async () => {
            return await getAI().models.generateContent({
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
