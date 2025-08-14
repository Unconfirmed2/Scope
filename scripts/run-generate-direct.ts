#!/usr/bin/env tsx
// Direct runner: constructs the same prompting pattern and calls Claude SDK directly.
// Usage: npx tsx scripts/run-generate-direct.ts "Your goal here"

import { generateContent } from '../src/ai/claude';

function stripCodeFences(s: string): string {
  const m = s.match(/```(?:json)?\n([\s\S]*?)```/i);
  return m ? m[1].trim() : s.trim();
}

async function main() {
  const goal = process.argv[2] || 'Plan and prepare a complete three-course dinner to serve six people';
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set in the environment.');
    process.exit(1);
  }

  // Use the same system prompt currently configured in generate-task-steps.ts
  const systemPrompt = 'You are an assistant who is an expert in taking a prompt, executing or analyzing it, and returning the results in a structured logical nested outline formatted in JSON. Go as broad or as deep as needed.';

  let userPrompt = `Here is the user's request:\n---\nGoal: "${goal}"\n---\n\nReturn JSON. No surrounding explanations.`;

  try {
    const response = await generateContent(userPrompt, systemPrompt, 4000);
    const unfenced = stripCodeFences(response);
    try {
      const json = JSON.parse(unfenced);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(unfenced);
    }
  } catch (err) {
    console.error('Failed to generate:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
