# Scope App: Technical Description & Rebuilding Guide

This document outlines the architecture, functionality, and core workflows of the "Scope" application. It is intended to serve as a guide for developers to understand, maintain, and rebuild the application from scratch.

## 1. Core Concept & Purpose

Scope is an AI-driven planning and organization assistant that can break down any topic, idea, or goal into structured, actionable components. Its tagline is "Scope out. Dive Deep. Complete."

The central idea is to transform break down any topic, goal, or problem into its structured, actionable components. This is achieved by leveraging a powerful AI backend that can adopt different "personas" (e.g., Planner, Analyst, Creative Director) to tailor its output to the user's specific intent.

**Core entities:**
- **Projects (or Folders):** Top-level containers for work. Each project has a name, description, and a collection of tasks.
- **Tasks (or Scopes):** Individual, nested items within a project. A task can have sub-tasks, a status (`todo`, `inprogress`, `done`), comments, AI-generated execution results, and summaries.
- **Personas:** Roles the AI can assume to generate specialized content. This is the primary mechanism for guiding the AI's output.

---

## 2. Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) with the App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) - A collection of reusable components built on Radix UI and Tailwind CSS. Components are not installed as a library but are integrated directly into the source code under `src/components/ui`.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration:** [Genkit](https://firebase.google.com/docs/genkit) (specifically `@genkit-ai/googleai` for Gemini models). All AI logic is encapsulated in server-side "flows."
- **State Management:** React Context and custom hooks (`useProjects`, `useAuth`). There is no external state management library like Redux or Zustand.
- **Data Persistence:** Browser `localStorage`. All user data (projects, tasks, etc.) is stored locally. The storage key is dynamically generated based on the user's UID from Neon Auth, providing per-user data isolation. For anonymous users, a default key is used.
- **Authentication:** neon and google oath

---

## 3. Project Structure Overview

```
/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Main application component (contains all UI logic)
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Global styles and shadcn/ui theme variables
│   │   └── actions.ts      # Server Actions that bridge the client and AI flows
│   │
│   ├── components/         # Reusable React components
│   │   ├── ui/             # Unmodified shadcn/ui components
│   │   ├── sidebar.tsx     # Project and task navigation
│   │   ├── tree-view.tsx   # Main hierarchical task view
│   │   ├── kanban-view.tsx # Kanban board view
│   │   └── ... (other view and dialog components)
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── use-projects.ts # Core logic for managing projects/tasks (CRUD, state)
│   │   ├── use-auth.tsx    # Firebase Authentication logic
│   │   └── use-toast.ts    # Notification system
│   │
│   ├── ai/                 # Genkit AI Flows
│   │   ├── flows/
│   │   │   └── generate-task-steps.ts # The primary flow for creating tasks from a goal
│   │   │   └── ... (other flows for summaries, execution, etc.)
│   │   └── genkit.ts       # Genkit initialization and configuration
│   │
│   └── lib/                # Shared utilities, types, and client-side libraries
│       ├── types.ts        # Core TypeScript type definitions (Project, Task, etc.)
│       ├── utils.ts        # Helper functions (sorting, counting, etc.)
│       └── firebase.ts     # Firebase client initialization
│
├── package.json            # Project dependencies and scripts
└── ... (config files)
```

---

## 4. Core Workflows

### a. AI-Powered Task Generation

This is the primary workflow of the application.

1.  **User Input**: On the main page (`page.tsx`), the user selects a **Persona** from a dropdown, types a **goal** into the input field, and can optionally upload an **image** for context. The available personas guide the AI's response:
    -   **Creative Director**: Brainstorms ideas, concepts, and mind maps.
    -   **Planner**: Builds structured plans like itineraries or roadmaps.
    -   **Operations Manager**: Creates step-by-step checklists or SOPs.
    -   **Analyst**: Handles market sizing, financial models, and projections.
    -   **Educator**: Explains complex topics with structured lessons.
    -   **Strategist**: Drafts high-level strategies with timelines and KPIs.
    -   **Writer**: Produces structured documentation or manuals.
    -   **Organizer**: Converts tasks into timelines or action plans.
    -   **General Assistant**: A catch-all that breaks down any request into a structured outline.

2.  **Action Trigger**: Clicking the "Add" button calls the `handleGenerateTasks` Server Action in `src/app/actions.ts`.

3.  **AI Flow Execution**: `handleGenerateTasks` validates the input and calls the `generateTaskSteps` function from `src/ai/flows/generate-task-steps.ts`.

4.  **Genkit Prompt**:
    -   The `generateTaskSteps` flow is a Genkit flow that takes the user's goal, persona, and optional image.
    -   It uses a dynamic Handlebars prompt with a `{{#switch}}` block that changes the AI's instructions based on the selected `persona`. For example: `{{#if persona}} You are an expert {{persona}}. {{#switch persona}} {{#case "Planner"}}Your function is to build structured plans...{{/case}} ... {{/switch}} {{/if}}`
    -   The prompt instructs the AI to return a structured JSON object with a specific schema (defined by `GenerateTaskStepsOutputSchema` using Zod), containing `breakdown_items` (a recursive list of tasks) and a high-level `synthesis`.

5.  **Confirmation Dialog**: The structured JSON response is sent back to the client and displayed in a confirmation dialog (`isConfirmationDialogOpen`). This dialog shows the proposed plan in a readable, hierarchical format.

6.  **Refinement & Acceptance**: The user can provide additional text/image feedback in this dialog, which triggers the AI flow again for refinement. Upon clicking "Accept," the `convertJsonToTasks` function in `page.tsx` recursively maps the AI's `breakdown_items` into the app's `Task` data structure.

7.  **State Update**: The newly created tasks are added to the active project using the `updateProject` function from the `useProjects` hook, which saves the new state to `localStorage`.

### b. Local Data and State Management (`useProjects` hook)

The `useProjects` hook is the "brain" of the client-side application.

-   **Initialization**: On load, it calls `loadInitialData`, which reads from `localStorage` using a key based on the user's ID (`projects_{uid}`). It sanitizes the data, ensures the "Unassigned" project exists, and validates the last active project/task.
-   **State**: It holds the `projects`, `activeItem` (current project/task), and `selectedTaskIds` in a single React `useState` object.
-   **Persistence**: A `useEffect` hook monitors changes to `projects` and `activeItem` and writes them back to `localStorage` whenever they change.
-   **CRUD Operations**: It exposes all functions needed to manage data, such as:
    -   `createProject`, `updateProject`, `deleteProject`
    -   `addSubtask`, `deleteTask`, `moveTaskToProject`, `promoteSubtaskToTask`
    -   `updateTaskAndPropagateStatus`: A key function that updates a task and then recursively updates the status of all its parent tasks based on the completion of their children.
    -   Functions for managing comments, summaries, and execution results.

### c. Authentication (`useAuth` hook)

-   The `useAuth` hook abstracts all Firebase Auth logic.
-   It provides the current `user` object and a `loading` state.
-   Crucially, it contains a `BYPASS_AUTH_FOR_TESTING` flag. When `true`, it returns a mock user object, allowing developers to work on the app without needing to configure Firebase credentials locally.
-   It exposes methods like `signIn`, `signUp`, `logOut`, and profile update functions.
-   The user's UID from this hook is used by `useProjects` to determine the correct `localStorage` key.

## 5. Rebuilding From Scratch: Key Steps

1.  **Scaffold a Next.js App**: Use `create-next-app` with TypeScript and Tailwind CSS.
2.  **Set up shadcn/ui**: Initialize shadcn/ui and add all the necessary components used in the project (Button, Dialog, Dropdown, etc.). This will create the `src/components/ui` directory.
3.  **Define Core Types**: Create `src/lib/types.ts` and define the `Project`, `Task`, `Comment`, and `Persona` types. This is a critical first step.
4.  **Build the `useProjects` Hook**: This is the most complex piece of client-side logic. Implement the `loadInitialData` and `save` effects first, then add the various CRUD methods one by one.
5.  **Build the `useAuth` Hook**: Set up a Firebase project and copy the config into `src/lib/firebase.ts`. Implement the `useAuth` hook to manage user state.
6.  **Implement AI Flows**:
    -   Install Genkit (`@genkit-ai/googleai`, etc.).
    -   Create the `src/ai/genkit.ts` configuration file.
    -   Implement the `generateTaskSteps` flow in `src/ai/flows/generate-task-steps.ts`, including the Zod schemas and the dynamic Handlebars prompt.
7.  **Create Server Actions**: Write the `handleGenerateTasks` function in `src/app/actions.ts` to connect the client to the Genkit flow.
8.  **Build the UI**:
    -   Start with the main layout in `src/app/layout.tsx`.
    -   Construct `src/app/page.tsx` piece by piece, starting with the main input form.
    -   Create the `Sidebar`, `TreeView`, and other view components, passing down props from `useProjects`.
    -   Wire the UI elements (buttons, forms) to the functions exposed by the `useProjects` and `useAuth` hooks.
    -   Implement the various dialogs for confirmation, settings, help, etc.
