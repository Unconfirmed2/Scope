'use server';
/**
 * @fileOverview An AI flow to attempt to execute a given scope using a case study methodology.
 *
 * - executeTask - A function that handles researching and acting on a scope.
 * - ExecuteTaskInput - The input type for the executeTask function.
 * - ExecuteTaskOutput - The return type for the executeTask function.
 */

import { generateContent } from '@/ai/claude';
import { z } from 'zod';

const ExecuteTaskInputSchema = z.object({
  task: z.string().describe('The scope to be executed.'),
  userInput: z.string().optional().describe('Additional context or instructions from the user.'),
  projectName: z.string().optional().describe('The name of the folder this scope is part of.'),
  otherTasks: z.array(z.string()).optional().describe('A list of other scopes in the folder to provide context.'),
});
export type ExecuteTaskInput = z.infer<typeof ExecuteTaskInputSchema>;

const ExecuteTaskOutputSchema = z.object({
  result: z.string().describe('A detailed case study and synthesis of the execution. Should be formatted in human-readable markdown using paragraphs and simple bullet points (using -).'),
});
export type ExecuteTaskOutput = z.infer<typeof ExecuteTaskOutputSchema>;

async function executeTaskFlow(input: ExecuteTaskInput): Promise<ExecuteTaskOutput> {
  // Validate and normalize input
  const validated = ExecuteTaskInputSchema.parse(input);
  const systemPrompt = `You are an expert consultant. Your goal is to "execute" a scope by treating it as a detailed consulting case study. You will perform a deep analysis, break down the problem, and then synthesize your findings into a coherent report.

If the request is ambiguous, make reasonable assumptions and state them clearly in your report.

Your response must be a comprehensive case study report. Format it as a human-readable document, not a dense markdown file. Use paragraphs for explanations and simple dashes (-) for bullet points. Avoid using '#' for headers unless absolutely necessary.

Your report must include:
- An overview of your interpretation of the scope and your analytical approach.
- A breakdown of the key elements (L1, L2, L3...) of the scope.
- A synthesis of your findings, including actionable recommendations, key insights, relevant links, resources, or code snippets if applicable.`;

  let userPrompt = `Scope to analyze: "${validated.task}"`;

  if (validated.userInput) {
    userPrompt += `\n\nThe user has provided these specific instructions, which you must prioritize:
---
${validated.userInput}
---`;
  }

  if (validated.projectName) {
    userPrompt += `\n\nThis scope is part of the folder: "${validated.projectName}". Consider this context.`;
  }

  if (validated.otherTasks && validated.otherTasks.length > 0) {
    userPrompt += `\n\nOther scopes in this folder include:`;
    validated.otherTasks.forEach(task => {
      userPrompt += `\n- ${task}`;
    });
  }

  userPrompt += `\n\nGenerate your full case study report now.`;

  const response = await generateContent(userPrompt, systemPrompt, 4000);
  
  const result: ExecuteTaskOutput = {
    result: response
  };
  
  return ExecuteTaskOutputSchema.parse(result);
}

export async function executeTask(input: ExecuteTaskInput): Promise<ExecuteTaskOutput> {
  return executeTaskFlow(input);
}
