"use server";

import { generateContent } from '@/ai/claude';

export type RephraseGoalInput = {
  goal: string;
  userInput?: string; // feedback to refine
  projectName?: string;
  existingTasks?: string[];
  photoDataUri?: string;
};

export type RephraseGoalOutput = {
  goal: string; // single-line refined scope
};

export async function rephraseGoal(input: RephraseGoalInput): Promise<RephraseGoalOutput> {
  const { goal, userInput, projectName, existingTasks, photoDataUri } = input;

  const systemPrompt = `You rewrite goals to be clearer, more specific, and actionable.
- Keep original intent.
- Remove fluff.
- Prefer a single, concise line.
- If feedback is provided, incorporate it.
- Avoid enumerating steps or producing nested structures. Output only the improved goal text.`;

  let userPrompt = `Original goal: ${JSON.stringify(goal)}\n`;
  if (userInput && userInput.trim()) {
    userPrompt += `Refinement feedback: ${JSON.stringify(userInput.trim())}\n`;
  }
  if (projectName) {
    userPrompt += `Context folder: ${JSON.stringify(projectName)}\n`;
  }
  if (existingTasks && existingTasks.length) {
    userPrompt += `Related existing scopes (avoid duplicates):\n- ${existingTasks.join('\n- ')}\n`;
  }
  if (photoDataUri) {
    userPrompt += `Image context provided.`;
  }

  // Small cap; it's a single-line rewrite
  const response = await generateContent(userPrompt, systemPrompt, 200);
  const rephrased = response.trim().replace(/^\"|\"$/g, '');
  return { goal: rephrased };
}
