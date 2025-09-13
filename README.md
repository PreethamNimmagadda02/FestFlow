Here is the system design document for FestFlow, the AI-powered event orchestration platform.

### **1. System Architecture**

FestFlow is a **client-server application** that leverages a **multi-agent system** on the backend to transform high-level event goals into actionable, well-executed plans. The architecture is designed to be modular and scalable, with a clear separation of concerns between the frontend and the backend services.

* **Frontend**: A responsive **single-page application (SPA)** built with **React** and styled with **Tailwind CSS**. It provides a user-friendly interface for defining event goals, monitoring progress, and approving AI-generated content.
* **Backend**: A **serverless architecture** powered by the **Google Gemini API**. This backend is responsible for the core AI logic, including goal decomposition and task execution, without the need to manage traditional server infrastructure.
* **AI Orchestration**: The system's intelligence lies in a team of specialized AI agents, each with a distinct role. This **multi-agent approach** allows for a sophisticated division of labor, where a **MasterPlannerAgent** breaks down the primary goal into smaller tasks and delegates them to other agents responsible for logistics, sponsorship, and marketing.

### **2. Data Design**

The application's data is structured around several key entities that track the state of the event plan. All data is managed within the client and persisted in the browser's **local storage**, which simplifies the architecture by eliminating the need for a dedicated database.

* **Tasks**: The fundamental unit of work in the system. Each task has an ID, title, description, assigned agent, status, progress, and dependencies on other tasks.
* **Approvals**: When an AI agent generates content (e.g., a marketing post), it creates an approval request. This object includes the original content, the agent that produced it, and its current status (pending, approved, or rejected).
* **Activity Logs**: A time-stamped record of all significant events and actions taken by the AI agents, providing a transparent audit trail of the entire process.
* **Agent Status**: Tracks the current state of each AI agent, such as whether it is idle, working, or has encountered an error.

### **3. Component Breakdown**

The user interface is composed of a series of modular **React components** that work together to create a seamless and intuitive user experience.

* **`App.tsx`**: The main application component that manages the overall state, including tasks, approvals, and agent statuses. It also orchestrates the interactions between the various UI components and the backend Gemini service.
* **`Dashboard.tsx`**: The central hub of the application, providing a comprehensive overview of the event plan. It includes an **Agent Status Grid**, an **Agent Activity Feed**, and a **Task Progress** section with both Kanban and Gantt chart views.
* **`TaskLane.tsx`**: A key component of the Kanban view that displays all tasks assigned to a specific agent. It allows users to track the progress of individual tasks and, in some cases, manually mark them as complete.
* **`ApprovalCard.tsx`**: A dedicated component for handling content that requires user approval. It displays the AI-generated content in an editable text area and provides buttons to approve or reject it.
* **`GanttChart.tsx`**: An alternative view for visualizing task dependencies and timelines. It dynamically generates a Gantt chart based on the task data, offering a high-level perspective on the project schedule.
* **`FestivalSetupForm.tsx`**: The initial form where users input their high-level event goals. Submitting this form triggers the AI-driven planning process.

### **4. Chosen Technologies**

The technologies for FestFlow were selected to prioritize **rapid development**, **scalability**, and a **modern user experience**.

* **React**: A popular and robust JavaScript library for building user interfaces. Its component-based architecture is a perfect fit for creating a modular and maintainable application.
* **Tailwind CSS**: A utility-first CSS framework that enables rapid styling without leaving the HTML. This accelerates the development process and ensures a consistent design language across the application.
* **Google Gemini API**: A powerful large language model that serves as the application's intelligent backend. It handles the complex tasks of goal decomposition and content generation, allowing the application to deliver sophisticated AI-driven features without a complex server-side implementation.
* **Vite**: A next-generation frontend build tool that offers an extremely fast development server and optimized build process. This enhances developer productivity and improves the overall performance of the application.## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
