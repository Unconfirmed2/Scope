#!/usr/bin/env tsx
// Simple runner to invoke the generate-task-steps AI flow and print JSON
// Usage: npx tsx scripts/run-generate.ts "Your goal here"

import { generateTaskSteps } from '../src/ai/flows/generate-task-steps';

async function main() {
  const goal = process.argv[2] || 'Plan and prepare a complete three-course dinner to serve six people';

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY is not set in the environment.');
    process.exit(1);
  }

  try {
    const result = await generateTaskSteps({ goal });
    // Print only the raw JSON structure returned by the AI
    console.log(JSON.stringify(result.raw, null, 2));
  } catch (err) {
    console.error('Failed to generate tasks:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
