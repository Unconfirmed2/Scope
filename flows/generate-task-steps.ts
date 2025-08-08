'use server';
/**
 * @fileOverview An AI flow that treats all queries as a detailed breakdown
 * and synthesis exercise, structuring them into a hierarchical JSON plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Persona } from '@/lib/types';


const BreakdownItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    title: z.string().describe('The title of this specific item (e.g., "I. Preparation", "A. Ingredients")'),
    content: z.array(z.string()).optional().describe('A paragraph or bullet points providing the core information for this item.'),
    children: z.array(BreakdownItemSchema).optional().describe('An array of child objects, following the same structure for nested levels.'),
  })
);

const GenerateTaskStepsInputSchema = z.object({
    goal: z.string().describe('The user\'s goal or query to be broken down.'),
    userInput: z.string().optional().describe('Additional context or instructions from the user.'),
    projectName: z.string().optional().describe('The name of the folder for context.'),
    existingTasks: z.array(z.string()).optional().describe('A list of existing scopes to provide context.'),
    photoDataUri: z.string().optional().describe('Optional Base64-encoded image for context.'),
    persona: z.nativeEnum(Persona).optional().nullable(),
});
export type GenerateTaskStepsInput = z.infer<typeof GenerateTaskStepsInputSchema>;


const GenerateTaskStepsOutputSchema = z.object({
  rephrased_goal: z.string().describe("A rephrasing of the user's original goal, stated as a clear action the AI will perform. This confirms understanding before proceeding."),
  breakdown_items: z.array(BreakdownItemSchema).describe("The core multi-level breakdown of the topic."),
  synthesis: z.string().describe("A concluding synthesis of the breakdown, summarizing the key takeaways and overall plan."),
});
export type GenerateTaskStepsOutput = z.infer<typeof GenerateTaskStepsOutputSchema>;


const generateTaskStepsFlow = ai.defineFlow(
  {
    name: 'generateTaskStepsFlow',
    inputSchema: GenerateTaskStepsInputSchema,
    outputSchema: GenerateTaskStepsOutputSchema,
  },
  async (input) => {
    
    let systemPrompt = `You are an expert consultant and strategist. Your primary function is to perform a comprehensive "breakdown and synthesis" for any user request. Treat every query as a request for a detailed, structured plan in JSON format.

Your response must be structured in three parts:
1.  **Rephrase Goal**: First, you must rephrase the user's goal to confirm your understanding. This should be a clear, concise statement of the action you will perform. For example, if the user says "fix a carburetor", you should rephrase it as "You are asking for a detailed, step-by-step guide on how to fix a carburetor." This goes in the 'rephrased_goal' field.

2.  **Analyze and Decompose**: After rephrasing, break down the user's goal into a logical, hierarchical structure using the 'breakdown_items' field.
    -   Each item in the breakdown must have a clear 'title'.
    -   Each item must have a 'content' section, which should be a paragraph or a list of bullet points (using simple dashes "-") that explains the 'what' and 'why' of that step.
    -   Items can have nested 'children' for further detail, following the same structure.

3.  **Synthesize**: After the breakdown, provide a concise, high-level 'synthesis'. This should be a summary of the overall strategy, key considerations, and the logical flow of the plan you've created. It should not just repeat the breakdown but provide a coherent narrative.
`;

    if (input.persona) {
        systemPrompt += `\n\nYou are an expert **${input.persona}**.`;
        switch (input.persona) {
            case Persona.Planner:
                systemPrompt += " Your function is to build structured, detailed, and actionable plans. If the user's request is for a recipe, meal plan, menu, or anything food-related, you MUST provide the complete recipe. This includes a list of ingredients with precise quantities, detailed step-by-step instructions for preparation, and any relevant supplementary information like nutritional facts or allergy warnings. Do not omit this for any food-related request.";
                break;
            case Persona.CreativeDirector:
                systemPrompt += " Your function is to brainstorm ideas and generate creative concepts. Structure your output as a mind map or a list of innovative ideas with brief descriptions.";
                break;
            case Persona.OperationsManager:
                systemPrompt += " Your function is to create step-by-step checklists, safety protocols, or standard operating procedures. Ensure every step is clear, concise, and unambiguous.";
                break;
            case Persona.Analyst:
                systemPrompt += " Your function is to handle market sizing, financial models, projections, and data analysis. Your outline should present a logical analysis, including assumptions, data points, and conclusions.";
                break;
            case Persona.Educator:
                systemPrompt += " Your function is to deliver structured, multi-level explanations, lessons, or study guides. Break down complex topics into digestible parts with clear headings and definitions.";
                break;
            case Persona.Strategist:
                systemPrompt += " Your function is to draft high-level strategies for marketing, sales, or operations. The outline should include timelines, KPIs, and required resources.";
                break;
            case Persona.Writer:
                systemPrompt += " Your function is to produce structured documentation, manuals, or instruction sets. The outline should be well-organized with clear sections and logical flow.";
                break;
            case Persona.Organizer:
                systemPrompt += " Your function is to convert tasks into timelines, Kanban boards, or priority-based action plans. The outline should be structured to reflect the chosen organizational method.";
                break;
            case Persona.GeneralAssistant:
                systemPrompt += " Your function is to act as a flexible, adaptive assistant to clarify the user's request and break it down into a structured, logical outline.";
                break;
        }
    }

    const prompt = ai.definePrompt({
        name: 'generateTaskStepsPrompt',
        input: { schema: GenerateTaskStepsInputSchema },
        output: { schema: GenerateTaskStepsOutputSchema },
        system: systemPrompt,
        prompt: `Here is the user's request:
---
Goal: "{{goal}}"
{{#if userInput}}
Additional Instructions: {{{userInput}}}
{{/if}}
{{#if photoDataUri}}
Image context is attached.
{{media url=photoDataUri}}
{{/if}}
---

{{#if projectName}}
This request is part of a larger folder named "{{projectName}}". Keep this context in mind.
{{/if}}

{{#if existingTasks}}
For context, here are some other scopes already in this folder:
{{#each existingTasks}}
- {{this}}
{{/each}}
{{/if}}

Now, generate the full rephrasing, breakdown, and synthesis in the required JSON format.
`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);

export async function generateTaskSteps(input: GenerateTaskStepsInput): Promise<GenerateTaskStepsOutput> {
  return generateTaskStepsFlow(input);
}
