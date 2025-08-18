'use server';
/**
 * @fileOverview AI flow to generate a folder or scope summary.
 *
 * - generateProjectSummary - A function that handles the summary generation.
 * - GenerateProjectSummaryInput - The input type for the generateProjectSummary function.
 * - GenerateProjectSummaryOutput - The return type for the generateProjectSummary function.
 */

import { generateContentBlocks } from '@/ai/claude';
import { z } from 'zod';

const GenerateProjectSummaryInputSchema = z.object({
  itemToSummarize: z.any().describe('A JSON object representing the folder or scope to summarize. The structure will be a simplified representation of the project/task model.'),
  contextName: z.string().describe('The name of the overall folder for context.'),
  previousSummary: z.string().optional().describe('The previous summary text, if available. If provided, the new summary should focus on the delta/changes since the last one.'),
});
export type GenerateProjectSummaryInput = z.infer<typeof GenerateProjectSummaryInputSchema>;

const GenerateProjectSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary in paragraph form, suitable for an email. Use markdown for formatting like lists.'),
});
export type GenerateProjectSummaryOutput = z.infer<typeof GenerateProjectSummaryOutputSchema>;


async function generateProjectSummaryFlow(input: GenerateProjectSummaryInput): Promise<GenerateProjectSummaryOutput> {
  const validated = GenerateProjectSummaryInputSchema.parse(input);
  const systemPrompt = `<rules>
You are an expert project manager with excellent judgment, tasked with writing a concise status summary for the given item.
The summary must be ready to be pasted into an email, using clear, human-readable markdown (use '-' for bullets, not '*').

<structure>
1. Top-Line Summary: brief, high-level paragraph summarizing overall status.
2. Key Scope Updates:
   - For each major sub-scope, provide a high-level summary. Briefly mention the status of its own sub-scopes within the summary, but do not list them all out.
   - Exercise judgment on comments: Only include accepted, significant comments.
   - Incorporate Execution Results: summarize key findings and takeaways.
</structure>
</rules>`;

  let userPrompt = `Context: You are summarizing an item within the folder named "${validated.contextName}".`;

  if (validated.previousSummary) {
  userPrompt += `\n\n<previous_summary>${validated.previousSummary}</previous_summary>\n<instruction>Focus on changes since the previous summary in both the top-line and key updates.</instruction>`;
  } else {
  userPrompt += `\n\n<instruction>This is the first summary request. Provide a comprehensive but high-level overview of the current status of the item, following the structure outlined above.</instruction>`;
  }

  userPrompt += `\n\n<item_json_attached>true</item_json_attached>\n<final_instruction>Generate the summary now.</final_instruction>`;

  const response = await generateContentBlocks({
    system: [{ text: systemPrompt, cache: true }],
    user: [
      { text: userPrompt.replace(/```json[\s\S]*```/, '').trim(), cache: false },
      { text: JSON.stringify(validated.itemToSummarize, null, 0), cache: true },
    ],
    maxTokens: 2000,
    temperature: 0.2,
  });
  
  const result: GenerateProjectSummaryOutput = {
    summary: response.trim()
  };
  
  return GenerateProjectSummaryOutputSchema.parse(result);
}

export async function generateProjectSummary(input: GenerateProjectSummaryInput): Promise<GenerateProjectSummaryOutput> {
  return generateProjectSummaryFlow(input);
}
