'use server';
/**
 * @fileOverview An AI flow to attempt to execute a given scope using a case study methodology.
 *
 * - executeTask - A function that handles researching and acting on a scope.
 * - ExecuteTaskInput - The input type for the executeTask function.
 * - ExecuteTaskOutput - The return type for the executeTask function.
 */

import { generateContentBlocks } from '@/ai/claude';
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
  const systemPrompt = `<rules>
You are an expert consultant. Your goal is to "execute" a scope by treating it as a detailed consulting case study. You will perform a deep analysis, break down the problem, and then synthesize your findings into a coherent report.

<guidance>
If the request is ambiguous, make reasonable assumptions and state them clearly in your report.
Format: human-readable document (paragraphs, '-' bullets). Avoid '#' headers unless necessary.
</guidance>

<report_must_include>
- Overview of interpretation and analytical approach.
- Breakdown of key elements (L1, L2, L3...).
- Synthesis with actionable recommendations, key insights, relevant links/resources/code snippets if applicable.
</report_must_include>
</rules>`;

  let userPrompt = `<request><scope>${validated.task}</scope>`;

  if (validated.userInput) {
    userPrompt += `\n<user_instructions>${validated.userInput}</user_instructions>`;
  }

  if (validated.projectName) {
    userPrompt += `\n<project_name>${validated.projectName}</project_name>`;
  }

  if (validated.otherTasks && validated.otherTasks.length > 0) {
    userPrompt += `\n<other_tasks>${validated.otherTasks.map(t=>`<task>${t}</task>`).join('')}</other_tasks>`;
  }

  userPrompt += `\n<final_instruction>Generate your full case study report now.</final_instruction></request>`;

  const response = await generateContentBlocks({
    system: [{ text: systemPrompt, cache: true }],
    user: [{ text: userPrompt, cache: false }],
    maxTokens: 4000,
    temperature: 0.2,
  });
  
  const result: ExecuteTaskOutput = {
    result: response
  };
  
  return ExecuteTaskOutputSchema.parse(result);
}

export async function executeTask(input: ExecuteTaskInput): Promise<ExecuteTaskOutput> {
  return executeTaskFlow(input);
}
