import { Persona } from './types';

export const personas: {id: Persona, title: string, description: string}[] = [
    { id: Persona.CreativeDirector, title: 'Brainstorm Ideas', description: 'Generates concepts, mind maps, and idea clusters for projects, content, or campaigns.' },
    { id: Persona.Planner, title: 'Plan Something', description: 'Builds structured plans like trip itineraries, event timelines, launch schedules, or phased roadmaps.' },
    { id: Persona.OperationsManager, title: 'Build a Checklist or SOP', description: 'Creates step-by-step checklists, safety protocols, or standard operating procedures.' },
    { id: Persona.Analyst, title: 'Analyze or Calculate', description: 'Handles market sizing, financial models, projections, and scenario analysis.' },
    { id: Persona.Educator, title: 'Learn or Explain a Topic', description: 'Delivers structured, multi-level explanations, lessons, or study guides.' },
    { id: Persona.Strategist, title: 'Draft a Strategy or Playbook', description: 'Builds marketing, sales, or operational strategies with timelines, KPIs, and resources.' },
    { id: Persona.Writer, title: 'Document or Write', description: 'Produces structured documentation, manuals, or instruction sets.' },
    { id: Persona.Organizer, title: 'Organize or Prioritize Tasks', description: 'Converts tasks into timelines, Kanban boards, or priority-based action plans.' },
    { id: Persona.GeneralAssistant, title: 'Other / Catch-All', description: 'Acts as a flexible, adaptive assistant to clarify the request and break it down into a structured outline.' },
];