"use server";

import { generateContent } from "@/ai/claude";

export type PreviewType = "alternative" | "subscopes" | "regenerate";

export type PreviewChangeInput = {
  type: PreviewType;
  selectedText: string;
  parentPathTitles?: string[];
  projectName?: string;
};

export type PreviewChangeOutput = {
  preview: string; // one short sentence, plain text
};

export async function previewChange(input: PreviewChangeInput): Promise<PreviewChangeOutput> {
  const { type, selectedText, parentPathTitles, projectName } = input;
  const system = `You write a single short sentence preview describing an intended change. No lists, no JSON, no code fences. 12-20 words.
Rules:
- Be specific and concrete (e.g., Replace appetizer with chicken pot stickers).
- Do not include steps, outline, or sub-items.
- Do not include quotes.`;

  const action =
    type === "alternative"
      ? "replace this item with a distinct alternative"
      : type === "subscopes"
      ? "add/refresh sub-items under this item"
      : "regenerate sub-items under this item";

  const userParts: string[] = [];
  if (projectName) userParts.push(`Project: ${projectName}`);
  if (parentPathTitles?.length) userParts.push(`Path: ${parentPathTitles.join(" > ")}`);
  userParts.push(`Target: ${selectedText}`);
  userParts.push(`Action: ${action}`);
  userParts.push("Write a single preview sentence describing exactly what you will change.");

  const user = userParts.join("\n");
  const raw = await generateContent(user, system, 500);
  const preview = raw.trim().replace(/^\"|\"$/g, "");
  return { preview };
}
