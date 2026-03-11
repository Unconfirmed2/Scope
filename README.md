# Scope

**Scope out. Dive Deep. Complete.**

Scope is an AI-powered planning app that breaks down any goal, idea, or project into structured, actionable plans. Pick a persona, describe what you want to accomplish, and let the AI generate a detailed hierarchical plan you can refine, track, and execute.

## About

Scope turns a single sentence — "plan a product launch" or "learn Spanish in 3 months" — into a nested tree of actionable steps. It uses Anthropic Claude to generate, regenerate, and propose alternatives for any part of your plan, with four AI modes:

- **Generate** — create a new plan from a goal
- **Subscope** — add detail under any existing scope
- **Regenerate** — replace a scope's children while keeping the parent
- **Alternative** — swap a scope for a different approach and patch dependent items

Plans are organized into **Folders** (projects) containing nested **Scopes** (tasks). Six views let you work however suits you best: List, Mind Map, Kanban, Comments, Summary, and Execution.

## How To Use

1. **Pick a persona** from the dropdown (Planner, Analyst, Creative Director, etc.) to steer the AI's output style.
2. **Type your goal** in the input field — optionally attach an image for context.
3. **Review the proposal** in the confirmation dialog. Refine it with follow-up instructions or accept it as-is.
4. **Track progress** — mark scopes as To Do / In Progress / Done. Parent status updates automatically.
5. **Go deeper** — right-click any scope to generate sub-scopes, regenerate, find alternatives, or execute a deep-dive case study.

Undo/Redo is available with `Ctrl/Cmd+Z` and `Ctrl+Y`.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 18, TypeScript
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **Database**: PostgreSQL on Neon via Prisma
- **Auth**: NextAuth with Google OAuth
- **UI**: Tailwind CSS, shadcn/ui (Radix primitives)

## Setup

### Prerequisites

- Node.js 20+ and npm
- A [Neon](https://neon.tech) database (or any PostgreSQL)
- An [Anthropic API key](https://console.anthropic.com)
- Google OAuth credentials (for sign-in)

### Install and run

```bash
# Install dependencies
npm ci

# Copy env template and fill in your values
cp .env.example .env

# Push the Prisma schema to your database
npm run db:push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example` for the full list. The required ones:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_DATABASE_URL` | Neon direct connection string |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Project Structure

```
src/
  app/            # Routes, layout, server actions
  ai/
    claude.ts     # Claude client and cache-aware helper
    flows/        # Server-side AI flows (generate, regenerate, alternative, summary, execute)
  components/     # UI components (tree view, sidebar, dialogs, shadcn/ui primitives)
  hooks/          # App state (useProjects), auth (useAuth), toast
  lib/            # Types, utilities, helpers
prisma/           # Schema and migrations
```

## Development

```bash
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run test       # Jest tests
```

## License

Private.
