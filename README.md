## My Details
### Preetham Nimmagadda 
### IIT(ISM) Dhanbad
### Electronics and Communication Engineering

## System Design Documentation of FestFlow

### Live Application Link

You can view the live application here: **[https://festflow-805bb.web.app/](https://festflow-805bb.web.app/)**

---

### System Architecture

FestFlow is a **client-server application** that utilizes a **multi-agent system** on the backend. The architecture is designed to be modular and scalable, with a clear separation of concerns between the frontend and the backend services.

* **Frontend**: A responsive **single-page application (SPA)** built with **React** and styled with **Tailwind CSS**. It provides an interface for defining event goals, monitoring progress, and approving AI-generated content.
* **Backend**: A **serverless architecture** powered by the **Google Gemini API**. This backend is responsible for the core AI logic, including goal decomposition and task execution.
* **AI Orchestration**: The system's intelligence lies in a team of specialized AI agents, each with a distinct role. A **MasterPlannerAgent** breaks down the primary goal into smaller tasks and delegates them to other agents responsible for logistics, sponsorship, and marketing.

---

### Data Design

The application's data is structured around several key entities that track the state of the event plan. All data is managed within the client and persisted in the browser's **local storage**, which eliminates the need for a dedicated database.

* **Tasks**: The fundamental unit of work. Each task has an ID, title, description, assigned agent, status, progress, and dependencies on other tasks.
* **Approvals**: When an AI agent generates content (e.g., a marketing post), it creates an approval request. This object includes the original content, the agent that produced it, and its current status (pending, approved, or rejected).
* **Activity Logs**: A time-stamped record of all significant events and actions taken by the AI agents.
* **Agent Status**: Tracks the current state of each AI agent (idle, working, or error).

---

### Component Breakdown

The user interface is composed of a series of modular **React components**.

* **`App.tsx`**: The main application component that manages the overall state and orchestrates the interactions between UI components and the backend Gemini service.
* **`Dashboard.tsx`**: The central hub of the application, providing an overview of the event plan. It includes an Agent Status Grid, an Agent Activity Feed, and a Task Progress section with both Kanban and Gantt chart views.
* **`TaskLane.tsx`**: A component in the Kanban view that displays all tasks assigned to a specific agent.
* **`ApprovalCard.tsx`**: A component for handling content that requires user approval, displaying AI-generated content with buttons to approve or reject it.
* **`GanttChart.tsx`**: An alternative view for visualizing task dependencies and timelines.
* **`FestivalSetupForm.tsx`**: The initial form where users input their high-level event goals, which triggers the AI planning process.

---

### Chosen Technologies

The technologies for FestFlow were selected to prioritize **rapid development**, **scalability**, and a **modern user experience**.

* **React**: A JavaScript library for building user interfaces, chosen for its component-based architecture which supports a modular and maintainable application.
* **Tailwind CSS**: A utility-first CSS framework that enables rapid styling and ensures a consistent design.
* **Google Gemini API**: A large language model that serves as the application's intelligent backend, handling goal decomposition and content generation.
* **Vite**: A frontend build tool that offers a fast development server and optimized build process, enhancing developer productivity and application performance.



## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


 ## Interaction logs

Link: https://g.co/gemini/share/2168e6ca076c
