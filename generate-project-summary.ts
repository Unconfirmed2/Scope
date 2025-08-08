'use server';
/**
 * @fileOverview AI flow to generate a folder or scope summary.
 *
 * - generateProjectSummary - A function that handles the summary generation.
 * - GenerateProjectSummaryInput - The input type for the generateProjectSummary function.
 * - GenerateProjectSummaryOutput - The return type for the generateProjectSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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


export async function generateProjectSummary(input: GenerateProjectSummaryInput): Promise<GenerateProjectSummaryOutput> {
  return generateProjectSummaryFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateProjectSummaryPrompt',
  input: { schema: GenerateProjectSummaryInputSchema },
  output: { schema: GenerateProjectSummaryOutputSchema },
  prompt: `You are an expert project manager with excellent judgment, tasked with writing a concise status summary for the given item.
The summary must be ready to be pasted into an email, using clear, human-readable markdown (use '-' for bullets, not '*').

Your goal is to provide a high-level overview, not a granular list of every single item. Use your discretion.

Context: You are summarizing an item within the folder named "{{contextName}}".

1.  **Top-Line Summary**: Start with a brief, high-level paragraph summarizing the item's overall status.
2.  **Key Scope Updates**:
    - For each major sub-scope, provide a high-level summary. Briefly mention the status of its own sub-scopes within the summary, but do not list them all out.
    - **Exercise judgment on comments**: Do not include every comment. Only mention a comment if it is 'accepted' and indicates a significant decision or a change in strategy. Minor or inconsequential comments should be ignored.
    - **Incorporate Execution Results**: If a scope has execution results, summarize the key findings or outcomes. Mention if the execution was successful or what the primary takeaways were. Do not just paste the entire result.
    - Format this section using '-' for bullet points for each main scope.

{{#if previousSummary}}
A previous summary has been provided. Your main goal is to report on the *changes* since that last summary.
Focus your Top-Line Summary and Key Scope Updates on what has changed (e.g., scopes completed, new issues, strategic shifts based on comments, new execution results).

Previous Summary:
---
{{{previousSummary}}}
---
{{else}}
This is the first summary request. Provide a comprehensive but high-level overview of the current status of the item, following the structure outlined above.
{{/if}}

Current Item Details (JSON):
\`\`\`json
{{{json itemToSummarize}}}
\`\`\`

Generate the summary now.
`,
});

const generateProjectSummaryFlow = ai.defineFlow(
  {
    name: 'generateProjectSummaryFlow',
    inputSchema: GenerateProjectSummaryInputSchema,
    outputSchema: GenerateProjectSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
