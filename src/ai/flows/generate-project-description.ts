'use server';
/**
 * @fileOverview AI flow to generate a folder description based on its name and scopes.
 *
 * - generateProjectDescription - A function that handles the description generation.
 * - GenerateProjectDescriptionInput - The input type for the generateProjectDescription function.
 * - GenerateProjectDescriptionOutput - The return type for the generateProjectDescription function.
 */

import { generateContent } from '@/ai/claude';
import { z } from 'zod';
import type { Task } from '@/lib/types';


// We can't pass the full Task[] type to the schema because of circular dependencies in Zod for recursive types.
// Instead, we'll just pass the scope text.
const GenerateProjectDescriptionInputSchema = z.object({
  projectName: z.string().describe('The name of the folder.'),
  tasks: z.array(z.string()).describe('A list of the top-level scope names in the folder.'),
});
export type GenerateProjectDescriptionInput = z.infer<typeof GenerateProjectDescriptionInputSchema>;

const GenerateProjectDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated folder description.'),
});
export type GenerateProjectDescriptionOutput = z.infer<typeof GenerateProjectDescriptionOutputSchema>;


async function generateProjectDescriptionFlow(input: GenerateProjectDescriptionInput): Promise<GenerateProjectDescriptionOutput> {
  const validated = GenerateProjectDescriptionInputSchema.parse(input);
  const systemPrompt = `You are an expert project manager. Your task is to write a concise, one-paragraph description for a folder based on its name and a list of its top-level scopes. The description should summarize the folder's main goal and scope.

Return only the folder description, nothing else.`;

  let userPrompt = `Folder Name: "${validated.projectName}"\n\nScopes:`;
  
  validated.tasks.forEach(task => {
    userPrompt += `\n- ${task}`;
  });

  userPrompt += `\n\nGenerate the folder description.`;

  const response = await generateContent(userPrompt, systemPrompt, 500);
  
  const result: GenerateProjectDescriptionOutput = {
    description: response.trim()
  };
  
  return GenerateProjectDescriptionOutputSchema.parse(result);
}

// The function the client calls, which can accept the full Task type.
export async function generateProjectDescription(projectName: string, tasks: Task[]): Promise<GenerateProjectDescriptionOutput> {
  // We map the full scopes to just their text to match the Zod schema for the flow.
  const taskTexts = tasks.map(t => t.text);
  return generateProjectDescriptionFlow({ projectName, tasks: taskTexts });
}
