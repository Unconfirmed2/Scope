
'use server';
/**
 * @fileOverview An AI flow that treats all queries as a detailed breakdown
 * and synthesis exercise, structuring them into a hierarchical plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
});
export type GenerateTaskStepsInput = z.infer<typeof GenerateTaskStepsInputSchema>;


const GenerateTaskStepsOutputSchema = z.object({
  breakdown_items: z.array(BreakdownItemSchema).describe("The core multi-level breakdown of the topic."),
  synthesis: z.string().describe("A concluding synthesis of the breakdown, summarizing the key takeaways and overall plan."),
});
export type GenerateTaskStepsOutput = z.infer<typeof GenerateTaskStepsOutputSchema>;

const prompt = ai.definePrompt({
    name: 'generateTaskStepsPrompt',
    input: { schema: GenerateTaskStepsInputSchema },
    output: { schema: GenerateTaskStepsOutputSchema },
    prompt: `You are an expert consultant and strategist. Your primary function is to perform a comprehensive "breakdown and synthesis" for any user request. Treat every query as a request for a detailed, structured plan.

Your response must be structured in two parts:
1.  **Analyze and Decompose**: Break down the user's goal into a logical, hierarchical structure (L1, L2, L3...).
    -   Each item in the breakdown must have a clear \`title\`.
    -   Each item must have a \`content\` section, which should be a paragraph or a list of bullet points (using simple dashes "-") that explains the 'what' and 'why' of that step.
    -   Items can have nested \`children\` for further detail, following the same structure.

2.  **Synthesize**: After the breakdown, provide a concise, high-level \`synthesis\`. This should be a summary of the overall strategy, key considerations, and the logical flow of the plan you've created. It should not just repeat the breakdown but provide a coherent narrative.

Here is the user's request:
---
Goal: "{{goal}}"
{{#if userInput}}
Additional Instructions: {{{userInput}}}
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

Now, generate the full breakdown and synthesis.
`,
});

const generateTaskStepsFlow = ai.defineFlow(
  {
    name: 'generateTaskStepsFlow',
    inputSchema: GenerateTaskStepsInputSchema,
    outputSchema: GenerateTaskStepsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function generateTaskSteps(input: GenerateTaskStepsInput): Promise<GenerateTaskStepsOutput> {
    return generateTaskStepsFlow(input);
}
