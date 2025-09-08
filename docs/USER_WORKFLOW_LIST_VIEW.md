## User workflow — List view

This document explains the typical user workflow when working in List view, from entering the initial prompt/goal through drilling down, regenerating scope, previewing and applying changes, and executing tasks. Each action lists the AI flow file it triggers and a short summary of what that flow does.

Checklist (high-level steps)
- Input initial goal / prompt
- Generate project description & summary
- Generate top-level tasks (outline)
- Inspect tasks in list view and drill down into task details
- Propose or generate alternative scope / regenerate tasks
- Preview proposed changes
- Apply changes (merge) or accept suggestions
- Execute a task or run automation
- View results, summaries, and history

1) Input initial prompt / goal
- Trigger(s): UI action: "Create project" / submit goal
- AI flow(s): `src/ai/flows/generate-project-description.ts`, `src/ai/flows/generate-project-summary.ts`
- What it does: Takes the user's high-level goal or prompt and produces a project description and brief summary to seed the workspace. Outputs usually include a textual project description, a short summary, and initial metadata used by later flows.

2) Generate top-level tasks (outline)
- Trigger(s): UI action: "Generate tasks" / "Outline"
- AI flow(s): `src/ai/flows/generate-task-steps.ts`
- What it does: Breaks the project description/goal into an ordered list of tasks or steps. Each task usually has a title, short description, and optionally estimated effort or tags.

3) Inspect and drill down in List view
- Trigger(s): Click a task in List view to expand or open details
- AI flow(s): (UI-driven) may call `src/ai/flows/execute-task.ts` when running a task, or `generate-task-steps.ts` again to further expand subtasks
- What it does: The UI shows task details, subtasks, attachments, discussion and action buttons (Propose changes, Regenerate, Preview, Execute). Drilling down may request additional task decomposition from the AI.

4) Rephrase goal / refine prompt
- Trigger(s): "Rephrase goal" button or edit top-level prompt
- AI flow(s): `src/ai/flows/rephrase-goal.ts`
- What it does: Produces alternative phrasings of the project goal or prompt to focus or broaden scope. Useful before regenerating tasks or proposing different approaches.

5) Propose changes / Generate alternative scope
- Trigger(s): "Propose changes" / "Alternative scope" / "Suggest" buttons
- AI flow(s): `src/ai/flows/propose-changes.ts`, `src/ai/flows/generate-alternative-scope.ts`
- What they do: `propose-changes.ts` generates targeted edits or suggestions for selected tasks or the project plan (small, actionable modifications). `generate-alternative-scope.ts` creates a broader alternative project scope or a different breakdown of tasks (larger changes or entirely different approaches).

6) Preview proposed change
- Trigger(s): "Preview change" button
- AI flow(s): `src/ai/flows/preview-change.ts`
- What it does: Renders the proposed edits or alternative scope alongside the current state so the user can compare differences before applying them. This step is read-only until the user accepts.

7) Regenerate a task or scope
- Trigger(s): "Regenerate" / "Regenerate task" button
- AI flow(s): `src/ai/flows/regenerate-task.ts`
- What it does: Re-runs task generation logic for a selected task or for the whole outline using updated inputs (edited goal, new constraints). It typically replaces or augments task text, subtasks, and estimates.

8) Apply / accept changes
- Trigger(s): "Apply" / "Accept" in preview or proposal dialogs
- AI flow(s): The UI performs the merge; it may call `src/ai/flows/preview-change.ts` or `propose-changes.ts` to finalize the change metadata. The actual apply is a client-side state change that persists the updated tasks.
- What it does: Commits proposed edits into the project/task tree, updating the List view and history.

9) Execute a task
- Trigger(s): "Execute" / "Run" button on a task
- AI flow(s): `src/ai/flows/execute-task.ts`
- What it does: Runs the task's execution flow which may produce content, code, or step-by-step outputs. Results are captured in the task's execution view, attached notes, and may update task status.

10) Generate alternative small-scope outputs
- Trigger(s): Contextual buttons like "Generate details", "Refine", or "Add steps"
- AI flow(s): `src/ai/flows/generate-task-steps.ts`, `src/ai/flows/generate-project-summary.ts`
- What it does: Generates small, focused outputs such as expanded steps for a single task, a short project summary for reporting, or a condensed description to share.

11) View history & regenerate iteratively
- Trigger(s): "History" / "Regenerate" / "Regenerate scope"
- AI flow(s): Any of the generation flows above; history UI simply shows prior states and allows reverting or re-running flows.
- What it does: Enables iterative editing—try different prompts, preview, accept, and re-run until satisfied.

Notes and tips
- The LLM client or integration is typically in `src/ai/claude.ts` or similar; it is used by the flows to perform the actual language-model calls.
- Small UI buttons usually map to single-purpose flows (preview, propose, rephrase). Bigger actions (regenerate whole scope, generate alternatives) map to the broader flows that return lists or structured outputs.
- Work iteratively: when in doubt, rephrase the goal (`rephrase-goal.ts`), preview proposed changes (`preview-change.ts`), then apply or regenerate (`regenerate-task.ts` / `propose-changes.ts`).

Where to look in code
- AI flows: `src/ai/flows/*.ts` (examples: `generate-task-steps.ts`, `generate-project-summary.ts`, `propose-changes.ts`, `regenerate-task.ts`, `execute-task.ts`)
- LLM client: `src/ai/claude.ts`
- UI entry points: `src/components/` and `src/app/` (List view and dialogs live under `src/components/` and `src/components/dialogs/`)

Completion summary
- This file maps the common List view user actions to the AI flow files and explains what each flow produces. Use it as a quick reference when changing UI buttons or updating flows.
