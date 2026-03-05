'use server';
/**
 * Propose (preview-only) what the AI will change before applying a full flow.
 * Returns a concise JSON-only summary suitable for showing in the confirmation dialog.
 */

import { z } from 'zod';
import { generateContent } from '@/ai/claude';

const ProposeChangesInputSchema = z.object({
  mode: z.enum(['alternative', 'regenerate', 'subscope']).describe('Which action the user intends.'),
  targetText: z.string().describe('The selected scope text (or parent scope for subscope/regenerate).'),
  projectName: z.string().optional(),
  parentPathTitles: z.array(z.string()).optional(),
  siblingTitles: z.array(z.string()).optional(),
  existingChildren: z.array(z.string()).optional(),
  userInput: z.string().optional().describe('Optional user feedback to tailor the proposal.'),
});
export type ProposeChangesInput = z.infer<typeof ProposeChangesInputSchema>;

const _ProposeChangesOutputSchema = z.object({
  summary: z.string().describe('1-2 sentences describing the intended change in plain English.'),
  bullets: z.array(z.string()).optional().describe('Optional short bullet points with key highlights.'),
});
export type ProposeChangesOutput = string;

export async function proposeChanges(input: ProposeChangesInput): Promise<ProposeChangesOutput> {
  const validated = ProposeChangesInputSchema.parse(input);

  const system = `Provide a brief plain-text preview of the intended change.\n- Keep it concise (max 2 sentences or ≤60 words).\n- No code fences. No JSON. No headings. No lists.\n- Be concrete and specific.`;

  const parts: string[] = [];
  parts.push(`Mode: ${validated.mode}`);
  if (validated.projectName) parts.push(`Project: ${validated.projectName}`);
  parts.push(`Target: ${validated.targetText}`);
  if (validated.parentPathTitles?.length) parts.push(`Parent Path: ${validated.parentPathTitles.join(' > ')}`);
  if (validated.siblingTitles?.length) parts.push(`Sibling Titles: ${validated.siblingTitles.join(' | ')}`);
  if (validated.existingChildren?.length) parts.push(`Existing Children: ${validated.existingChildren.join(' | ')}`);
  if (validated.userInput) {
    parts.push('User Feedback:');
    parts.push(validated.userInput);
  }
  parts.push('\nGuidance:');
  if (validated.mode === 'alternative') {
    parts.push('Describe a distinct replacement for the selected scope and mention any minimal dependent text/description updates.');
  } else if (validated.mode === 'regenerate') {
    parts.push('Describe how you would replace all sub-scopes (theme, coverage) without changing the parent title.');
  } else {
    parts.push('Describe the new sub-scopes you would add (focus areas only).');
  }

  const user = parts.join('\n');
  const raw = await generateContent(user, system, 800);

  // Sanitize: strip code fences if present, trim, collapse whitespace.
  let text = raw.trim();
  const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/m;
  const m = text.match(fence);
  if (m && m[1]) text = m[1].trim();
  text = text.replace(/\s+/g, ' ').trim();
  // Enforce soft cap ~60 words
  const words = text.split(/\s+/);
  if (words.length > 60) text = words.slice(0, 60).join(' ') + '…';
  return text;
}
