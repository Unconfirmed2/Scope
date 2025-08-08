'use server';
/**
 * @fileOverview An AI flow to regenerate or rephrase a scope based on user feedback.
 *
 * - regenerateTask - A function that handles rephrasing a scope.
 * - RegenerateTaskInput - The input type for the regenerateTask function.
 * - RegenerateTaskOutput - The return type for the regenerateTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Persona } from '@/lib/types';

const RegenerateTaskInputSchema = z.object({
  originalTask: z.string().describe('The original text of the scope.'),
  userInput: z.string().optional().describe('Additional instructions or feedback from the user on how to improve the scope.'),
  persona: z.nativeEnum(Persona).optional().nullable(),
});
export type RegenerateTaskInput = z.infer<typeof RegenerateTaskInputSchema>;

const RegenerateTaskOutputSchema = z.object({
  newTask: z.string().describe('The new, regenerated text for the scope.'),
});
export type RegenerateTaskOutput = z.infer<typeof RegenerateTaskOutputSchema>;

export async function regenerateTask(input: RegenerateTaskInput): Promise<RegenerateTaskOutput> {
  return regenerateTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'regenerateTaskPrompt',
  input: { schema: RegenerateTaskInputSchema },
  output: { schema: RegenerateTaskOutputSchema },
  prompt: `You are an expert at refining and clarifying goals. Your job is to rewrite a scope to be more effective, based on the original text and user feedback.
{{#if persona}}
You should adopt the persona of an expert **{{persona}}** to guide your response.
{{/if}}

Original Scope: "{{originalTask}}"

{{#if userInput}}
User Feedback:
---
{{{userInput}}}
---
{{/if}}

Rewrite the scope based on the original and the feedback. If feedback is provided, prioritize it. The new scope should be a single, concise sentence. Do not output anything else.

Generate the new scope text.
`,
});

const regenerateTaskFlow = ai.defineFlow(
  {
    name: 'regenerateTaskFlow',
    inputSchema: RegenerateTaskInputSchema,
    outputSchema: RegenerateTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
