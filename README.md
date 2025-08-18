# Scope

Scope is a Next.js project starter focused on AI-assisted planning and execution. It provides a flexible tree-based workspace with multiple views (List, Mind Map, Kanban, Comments, Summary, Execution) and a unified AI dialog for creating, refining, and replacing scopes.

## Highlights

- Unified AI dialog for four flows:
	- Initial: generate a new outline for a goal
	- Subscope: add children under a scope
	- Regenerate: replace a scope’s children (keep parent title)
	- Alternative: replace a scope with a distinct alternative and update only truly dependent items
- Strict JSON-only outline generation with lossless parsing (single-root unwrap, preserves order/casing)
- Shallow sorting: sort only top-level scopes, never child order
- Alternative flow patches:
	- Returns three parts: "New Task Outline", "Updates", and "Changes Summary"
	- Applies targeted patches by id/path (text/description only) to dependent items
	- Shows a concise “Changes applied” summary
- Proposal previews: brief plain text previews in the dialog (no code fences)
- Undo/Redo with persistence (localStorage) and a History modal
- Row-level badges (“New”, “Updated”) for recent changes
- Prompt caching support for Anthropic (optional) and XML-like tag prompting for better separation of rules vs. inputs

## Tech stack

- Next.js (App Router), React, TypeScript, Tailwind CSS
- Anthropic Claude via `@anthropic-ai/sdk`

## Project structure

```
src/
	app/                # Next.js app routes, layout, and the main page (unified dialog)
	components/         # UI components (tree view, dialogs, views, shadcn/ui primitives)
	hooks/              # State, auth, toast
	ai/
		claude.ts         # Claude client + cache-aware helper
		flows/            # AI flows (generate/regenerate/alternative/summary/proposal)
	lib/                # Utilities (sorting, JSON→tree, dependency scan, types)
```

Key files
- `src/app/page.tsx`: Main UI and the unified confirmation/refine dialog
- `src/components/tree-view.tsx`: Tree view with row menus, badges, and actions
- `src/hooks/use-projects.ts`: App state, persistence, history, undo/redo
- `src/ai/claude.ts`: Anthropic client and cache-aware `generateContentBlocks`
- `src/ai/flows/*`: Server-side flows ("use server") for generation and summaries

## Setup

1) Requirements
- Node.js LTS and npm

2) Install
```
npm install
```

3) Environment
Create `.env.local` and set:
```
ANTHROPIC_API_KEY=your_key_here
# optional: enable prompt caching when available on your Anthropic account
ANTHROPIC_PROMPT_CACHING=1
```

4) Run
```
npm run dev
```
Open http://localhost:3000

## Using the AI dialog

- Create a folder and select a scope, or start from the input at the top.
- The dialog opens to preview a proposal (plain text). You can refine inputs and accept.
- Modes:
	- Initial: Creates a new top-level scope with a JSON outline
	- Subscope: Generates children under the selected scope
	- Regenerate: Replaces children under the selected scope (keeps its title)
	- Alternative: Replaces the selected scope with a distinct alternative and applies minimal text/description updates to dependent items

Notes on “Alternative”
- The AI returns:
	- "New Task Outline": single-root JSON outline for the replacement
	- "Updates": minimal patches to other items by id, limited to `/text` or `/description`
	- "Changes Summary": high-level summary for the dialog
- The app replaces the selected node (preserving its id) and applies patches to targets.
- Badges mark the replaced node and patched nodes as “Updated.”

## Views

- List (Tree): main editing view with row menus and badges
- Mind Map: read-only map derived from the tree
- Kanban: status swimlanes (todo / in progress / done)
- Comments: focus on threaded comments and statuses
- Summary: AI-generated status summaries for the project or a scope
- Execution: “case study” style AI execution of a scope

## Data and history

- State persists to localStorage (separate for anonymous vs. signed-in users)
- History with undo/redo is stored and restored on reload
- Keyboard shortcuts:
	- Undo: Ctrl/Cmd + Z
	- Redo: Ctrl + Y or Shift + Ctrl/Cmd + Z

## Prompt engineering

- Outline generation: strict JSON-only (single root, Title Case keys, no code fences)
- Alternative/regenerate prompts use XML-like tags to separate rules, inputs, and structure
- Prompt caching (optional):
	- `generateContentBlocks` allows marking system and large JSON context as cacheable
	- Enable with `ANTHROPIC_PROMPT_CACHING=1` (requires Anthropic support for your key)

## Development

- Build:
```
npm run build
```
- The server flows under `src/ai/flows/*` are "use server" modules; export only async functions and types from these files.
- Styling: Tailwind CSS; shadcn/ui components under `src/components/ui`.

## Troubleshooting

Alternative applied but some references didn’t change?
- The app now sends a minimal full project JSON to the AI for alternatives so it can locate cross-branch references and propose precise patches. If a reference still doesn’t update, refine your request with key terms found in the other branch, or check the “Updated Items” count in the summary.

Badges show but content didn’t change?
- Ensure the AI result contained a valid "New Task Outline" (the app is tolerant of either `NewTaskOutline` or `"New Task Outline"`).
- If patches didn’t include certain branches, they won’t change; see note above.

## Roadmap ideas

- Optional UI-only numbering for readability (1, 1.1, ...)
- Test suite for history, badges, and proposal lifecycle
- Richer “Changes applied” previews (A | B pairs)

---

For a guided start, see `src/app/page.tsx` and the AI flows under `src/ai/flows/`.
