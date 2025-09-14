## My Details
### Preetham Nimmagadda 
### IIT(ISM) Dhanbad
### Electronics and Communication Engineering

---

## Live Application Link

You can view the live application here: **[https://festflow-805bb.web.app/](https://festflow-805bb.web.app/)**

---

## System Design Documentation of FestFlow

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
* **Data Flow Diagram**
  
  <img width="987" height="246" alt="Screenshot 2025-09-14 at 8 45 32 AM" src="https://github.com/user-attachments/assets/aa9a00a0-0fc6-4f24-a08c-db3beb74c0c9" />

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

### Growth Strategy

### Phase 2: Enhanced Interactivity and User Experience

* **Interactive Gantt Chart:** Allow users to drag and drop tasks on the Gantt chart to adjust schedules and dependencies.
* **Notifications:** Implement a notification system to alert users of important events, such as when a task is completed or an approval is required.
* **Improved Task Management:**
    * Allow for the creation of sub-tasks within larger tasks.
    * Add the ability to attach files to tasks (e.g., contracts, design mockups).
    * Implement a search and filtering system for tasks.

### Phase 3: Real-World Integration and Automation

* **API Integrations:**
    * **LogisticsCoordinatorAgent:** Connect to Google Calendar API to automatically schedule events and reminders. Integrate with mapping services like Google Maps for venue and travel planning.
    * **SponsorshipOutreachAgent:** Integrate with email services like the Gmail API to allow the agent to send outreach emails directly (after user approval).
    * **MarketingAgent:** Connect to social media APIs (e.g., Twitter, Facebook) to schedule and post promotional content.
* **Vendor and Contact Management:** Add a dedicated section for managing contacts, such as sponsors, vendors, and team members. This could include contact information, communication history, and status.

### Phase 4: Collaboration and Scalability

* **Multi-User Collaboration:**
    * Introduce user accounts and roles (e.g., Event Manager, Marketing Lead, Finance Officer).
    * Implement real-time collaboration features, allowing multiple users to work on the same event plan simultaneously.
    * Add a commenting system for tasks to facilitate team communication.
* **Backend and Database:**
    * Migrate from local storage to a cloud-based database like Firebase Firestore. This will enable data persistence across devices, real-time updates, and multi-user support.
* **Event Templates:** Allow users to save successful event plans as templates for future use. This would streamline the setup process for recurring or similar events.

### Phase 5: Advanced AI and Analytics

* **New AI Agents:**
    * **FinanceAgent:** An agent dedicated to managing the event budget, tracking expenses, and providing financial reports.
    * **VendorAgent:** An agent that can research and suggest potential vendors based on the event's requirements.
* **Learning and Adaptation:** Enhance the AI agents to learn from user feedback. For example, if a user frequently edits marketing copy to be more "energetic," the `MarketingAgent` could adapt its writing style in the future.
* **Analytics Dashboard:** Create a dashboard that provides analytics and insights into the event's progress, such as:
    * Social media engagement for marketing posts.
    * Response rates from sponsorship emails.
    * Budget tracking and expense analysis.
* **Predictive Analysis:** In a more advanced stage, the AI could use data from past events to predict potential bottlenecks, suggest more efficient timelines, or forecast budget requirements.



## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


 ## Interaction logs

Link: https://g.co/gemini/share/2168e6ca076c
