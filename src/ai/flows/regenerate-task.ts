'use server';
/**
 * @fileOverview An AI flow to regenerate or rephrase a scope based on user feedback.
 *
 * - regenerateTask - A function that handles rephrasing a scope.
 * - RegenerateTaskInput - The input type for the regenerateTask function.
 * - RegenerateTaskOutput - The return type for the regenerateTask function.
 */

import { generateContent } from '@/ai/claude';
import { z } from 'zod';

const RegenerateTaskInputSchema = z.object({
  originalTask: z.string().describe('The original text of the scope.'),
  userInput: z.string().optional().describe('Additional instructions or feedback from the user on how to improve the scope.'),
});
export type RegenerateTaskInput = z.infer<typeof RegenerateTaskInputSchema>;

const RegenerateTaskOutputSchema = z.object({
  newTask: z.string().describe('The new, regenerated text for the scope.'),
});
export type RegenerateTaskOutput = z.infer<typeof RegenerateTaskOutputSchema>;

async function regenerateTaskFlow(input: RegenerateTaskInput): Promise<RegenerateTaskOutput> {
  const validated = RegenerateTaskInputSchema.parse(input);
  const systemPrompt = `You are an expert at refining and clarifying goals. Your job is to rewrite a scope to be more effective, based on the original text and user feedback.

Rewrite the scope based on the original and the feedback. If feedback is provided, prioritize it. The new scope should be a single, concise sentence. Do not output anything else.

Return only the new scope text, nothing else.`;


  let userPrompt = `Original Scope: "${validated.originalTask}"`;

  if (validated.userInput) {
    userPrompt += `\n\nUser Feedback:
---
${validated.userInput}
---`;
  }

  userPrompt += `\n\nGenerate the new scope text.`;

  const response = await generateContent(userPrompt, systemPrompt, 1000);
  
  const result: RegenerateTaskOutput = {
    newTask: response.trim()
  };
  
  return RegenerateTaskOutputSchema.parse(result);
}

export async function regenerateTask(input: RegenerateTaskInput): Promise<RegenerateTaskOutput> {
  return regenerateTaskFlow(input);
}
