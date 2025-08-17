"use server";

import { generateContent } from "@/ai/claude";

export type DependencyCandidate = {
  id: string;
  path: string; // human-readable breadcrumb path
  text?: string;
  description?: string;
};

export type AlternativeScopeInput = {
  // The selected node we are replacing
  selectedNode: {
    id: string;
    text: string;
    description?: string;
    subtasks?: Array<{ text: string; description?: string; subtasks?: any[] }>;
  };
  parentPathTitles: string[]; // e.g., ["Menu Planning", "Course Selection"]
  siblingTitles: string[]; // for duplication avoidance
  inferredType?: string; // optional hint (e.g., "Item", "Task")

  // Dependency handling
  dependencyCandidates: DependencyCandidate[];

  // Context control
  projectName?: string;
  fullProjectJson?: any; // optionally include the whole JSON when dependencies exist
  trimmedContext?: any; // smaller payload when not needed
};

export type AlternativeScopeOutput = {
  // Outline for the new node, using the standard outline rules
  NewTaskOutline: any;
  // Minimal patches to related items
  Updates: Array<{
    "Target Id": string;
    Changes: Array<{
      Path: string; // JSON Pointer to field, e.g., "/text" or "/description"
      Op: "replace" | "update";
      Value: any;
      Reason?: string;
    }>;
  }>;
  // High-level summary for dialog
  "Changes Summary": {
    "Replaced Node Title": string;
    "Updated Targets": string[];
    Notes?: string[];
  };
};

export async function generateAlternativeScope(input: AlternativeScopeInput): Promise<AlternativeScopeOutput> {
  const { selectedNode, parentPathTitles, siblingTitles, inferredType, dependencyCandidates, projectName, fullProjectJson, trimmedContext } = input;

  const system = `You produce JSON only. No code fences. Title Case keys.
This response MUST contain exactly three top-level keys:
- "New Task Outline": one JSON object containing the replacement outline for the selected node. It MUST follow the standard outline rules (one root key, Title Case keys, valid JSON). Do NOT include any change-log or patch keys inside it.
- "Updates": an array of minimal patches to items that truly reference the selected node. Each patch has "Target Id" and a list of "Changes". Changes are strictly limited to Path=/text or /description with Op=replace|update and a Value. Do NOT propose unrelated edits.
- "Changes Summary": a small object summarizing the replacement and targeted updates.

Critical Separation:
- The strict patch schema applies ONLY to "Updates" and "Changes Summary".
- It does NOT apply to "New Task Outline". The outline must look like a normal outline JSON, not a patch.
`;

  const inferred = inferredType || "Item";
  const userParts: string[] = [];
  userParts.push(`You will replace one ${inferred} at the same level, keeping structure/format consistent.`);
  userParts.push(`Selected Node (snapshot):\n- Text: ${selectedNode.text}\n- Description: ${selectedNode.description || ""}\n- Children Count: ${selectedNode.subtasks?.length || 0}`);
  if (parentPathTitles?.length) userParts.push(`Parent Path: ${parentPathTitles.join(" > ")}`);
  if (siblingTitles?.length) userParts.push(`Sibling Titles (avoid duplicates):\n${siblingTitles.map(t=>`- ${t}`).join("\n")}`);

  if (projectName) userParts.push(`Project Context: ${projectName}`);

  if (dependencyCandidates?.length) {
    userParts.push(`Potentially Related Items (for targeted updates only):`);
    for (const c of dependencyCandidates.slice(0, 50)) {
      const line = `- ${c.id} @ ${c.path}: ${c.text || ""}${c.description ? " | " + c.description : ""}`.trim();
      userParts.push(line);
    }
  }

  if (fullProjectJson) {
    userParts.push(`Full JSON context is provided below to ensure consistency and help identify true dependencies. Do not modify unrelated items. Only propose minimal updates in "Updates" for items that reference the selected node.`);
    try {
      userParts.push(JSON.stringify(fullProjectJson));
    } catch {}
  } else if (trimmedContext) {
    userParts.push(`Trimmed context is provided. Do not modify unrelated items. Only propose minimal updates in "Updates" for items that reference the selected node.`);
    try { userParts.push(JSON.stringify(trimmedContext)); } catch {}
  }

  userParts.push(`\nInstructions:\n- Create a different ${inferred} to REPLACE the selected node. Keep its format/nesting depth similar (not identical content).\n- Do NOT paraphrase; produce a DISTINCT alternative title/content.\n- Only update truly dependent items (e.g., where the old title is referenced).\n- Limit updates to /text or /description fields with minimal phrasing changes.\n- Leave everything else unchanged.\n\nReturn JSON with exactly these three top-level keys: "New Task Outline", "Updates", "Changes Summary".`);

  const user = userParts.join("\n\n");
  const raw = await generateContent(user, system, 4000);

  // We trust the model to return JSON; attempt to extract object
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1) {
    throw new Error("Model did not return JSON");
  }
  const json = JSON.parse(raw.slice(first, last + 1));

  // Basic validation fence: ensure required keys exist
  if (!json || typeof json !== "object") throw new Error("Invalid JSON");
  for (const k of ["New Task Outline", "Updates", "Changes Summary"]) {
    if (!(k in json)) throw new Error("Missing key: " + k);
  }

  return json as AlternativeScopeOutput;
}
