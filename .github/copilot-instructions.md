# Copilot Instructions for Scope

## Overview
Scope is a Next.js project starter. The project is structured to facilitate modular development with a focus on reusable components, hooks, and utilities. The primary entry point for the application is `src/app/page.tsx`.

## Architecture
- **Pages and Layouts**: The main application logic resides in the `src/app/` directory. Key files include:
  - `page.tsx`: The main entry point for the application.
  - `layout.tsx`: Defines the layout structure for the app.
- **Components**: Reusable UI components are located in `src/components/` and its subdirectories. Notable subdirectories include:
  - `ui/`: Contains atomic UI elements like buttons, forms, and modals.
  - `views/`: Higher-level components like `kanban-view.tsx` and `mind-map-view.tsx`.
- **Hooks**: Custom React hooks are stored in `src/hooks/`. Examples include `use-auth.tsx` for authentication and `use-toast.ts` for toast notifications.
- **Utilities**: Shared utility functions and types are in `src/lib/`.
- **AI Flows**: AI-related logic is in `src/ai/flows/`, including task execution and project summary generation.

## Developer Workflows
### Build and Run
- Install dependencies: `npm install`
- Start the development server: `npm run dev`

### Testing
- No explicit test setup is documented. Add tests in a `__tests__` directory or similar if needed.

### Debugging
- Use browser developer tools and Next.js debugging features.

## Conventions and Patterns
- **Component Structure**: Follow the atomic design principle for UI components. Place atomic components in `src/components/ui/` and higher-level components in `src/components/`.
- **Hooks**: Encapsulate reusable logic in `src/hooks/`.
- **AI Integration**: AI-related logic is modularized under `src/ai/flows/`.
- **Styling**: Global styles are defined in `src/app/globals.css`. Tailwind CSS is used for utility-first styling.

## External Dependencies
// Backend integration: previously used Firebase; now backend is pluggable and not required.
- **Tailwind CSS**: Configured in `tailwind.config.ts` and `postcss.config.mjs`.

## Examples
- **Reusable Button Component**: See `src/components/ui/button.tsx`.
- **Custom Hook for Authentication**: See `src/hooks/use-auth.tsx`.
- **AI Task Execution Flow**: See `src/ai/flows/execute-task.ts`.

## Notes
- Ensure all new components and hooks are documented and follow the existing folder structure.
- Update this file as the project evolves to keep AI agents productive.
