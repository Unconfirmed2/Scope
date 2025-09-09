"use server";

import { generateContentBlocks } from "@/ai/claude";

export type DependencyCandidate = {
  id: string;
  path: string; // human-readable breadcrumb path
  text?: string;
  description?: string;
  romanIndex?: string; // Roman numeral index for AI reference
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
  romanIndexMap?: Map<string, string>; // Map from task ID to Roman numeral

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
    "Roman Index"?: string; // Roman numeral reference for AI convenience
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
  const { selectedNode, parentPathTitles, siblingTitles, inferredType, dependencyCandidates, romanIndexMap, projectName, fullProjectJson, trimmedContext } = input;

  const system = `<rules>
<output_contract>
You produce JSON only. No code fences. Title Case keys.
This response MUST contain exactly three top-level keys:
- "New Task Outline": one JSON object containing the replacement outline for the selected node. It MUST follow the standard outline rules (one root key, Title Case keys, valid JSON). Do NOT include any change-log or patch keys inside it.
- "Updates": an array of minimal patches to items that truly reference the selected node. Each patch has "Target Id" and a list of "Changes". Changes are strictly limited to Path=/text or /description with Op=replace|update and a Value. Do NOT propose unrelated edits.
- "Changes Summary": a small object summarizing the replacement and targeted updates.
</output_contract>

<critical_separation>
- The strict patch schema applies ONLY to "Updates" and "Changes Summary".
- It does NOT apply to "New Task Outline". The outline must look like a normal outline JSON, not a patch.
</critical_separation>
</rules>`;

  const inferred = inferredType || "Item";
  const userParts: string[] = [];
  userParts.push(`<task>
  <instruction>You will replace one ${inferred} at the same level, keeping structure/format consistent.</instruction>
  <selected_node>
    <text>${selectedNode.text}</text>
    ${selectedNode.description ? `<description>${selectedNode.description}</description>` : ''}
    <children_count>${selectedNode.subtasks?.length || 0}</children_count>
  </selected_node>
  ${parentPathTitles?.length ? `<parent_path>${parentPathTitles.map(t=>`<title>${t}</title>`).join('')}</parent_path>` : ''}
  ${siblingTitles?.length ? `<siblings>${siblingTitles.map(t=>`<title>${t}</title>`).join('')}</siblings>` : ''}
  ${projectName ? `<project_name>${projectName}</project_name>` : ''}
</task>`);

  if (dependencyCandidates?.length) {
    userParts.push(`<dependency_candidates>${dependencyCandidates.slice(0,50).map(c=>`<candidate><roman_index>${c.romanIndex || romanIndexMap?.get(c.id) || ''}</roman_index><id>${c.id}</id><path>${c.path}</path>${c.text?`<text>${c.text}</text>`:''}${c.description?`<description>${c.description}</description>`:''}</candidate>`).join('')}</dependency_candidates>`);
  }

  if (fullProjectJson) {
    userParts.push(`<context_note>Full JSON context is attached separately. Only propose minimal updates for true references.</context_note>`);
  } else if (trimmedContext) {
    userParts.push(`<context_note>Trimmed context is attached separately. Only propose minimal updates for true references.</context_note>`);
  }

  userParts.push(`<instructions>
  - Create a different ${inferred} to REPLACE the selected node. Keep its format/nesting depth similar (not identical content).
  - Do NOT paraphrase; produce a DISTINCT alternative title/content.
  - Limit updates to /text or /description fields with minimal phrasing changes.
  - Each dependency candidate has a roman_index (I, II, III, etc.) for reference. You may reference these indices in your reasoning.
  - When providing Updates, you can optionally include the "Roman Index" for clarity, but "Target Id" is still required.
  - Leave everything else unchanged.
  - Return JSON with exactly these three top-level keys: "New Task Outline", "Updates", "Changes Summary".
</instructions>`);

  const user = userParts.join("\n\n");
  // Compose cache-aware blocks: cache system rules; cache large JSON context if present.
  const userBlocks = [{ text: user, cache: false }];
  // Extract and move any appended JSON context into its own cacheable block
  if (fullProjectJson) {
    try {
      userBlocks.push({ text: JSON.stringify(fullProjectJson), cache: true });
    } catch {}
  } else if (trimmedContext) {
    try {
      userBlocks.push({ text: JSON.stringify(trimmedContext), cache: true });
    } catch {}
  }

  const raw = await generateContentBlocks({
    system: [{ text: system, cache: true }],
    user: userBlocks,
    maxTokens: 4000,
    temperature: 0.2,
  });

  // Helper: strip common code fences if they appear
  const stripFences = (s: string) => s
    .replace(/```\s*json\s*/gi, "")
    .replace(/```\s*JSON\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const cleaned = stripFences(raw);

  // Attempt to extract the outermost JSON object from the cleaned text
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) {
    throw new Error("Model did not return JSON");
  }
  const parsed = JSON.parse(cleaned.slice(first, last + 1));

  if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");

  // Normalize output into the strict AlternativeScopeOutput shape
  const normalize = (j: any): AlternativeScopeOutput => {
    const out: any = {};
    // Outline: tolerate either key, prefer typed NewTaskOutline
    out.NewTaskOutline = j.NewTaskOutline ?? j["New Task Outline"];

    // Updates: tolerate minor key variations and sanitize
    const rawUpdates = Array.isArray(j.Updates)
      ? j.Updates
      : Array.isArray(j.updates)
        ? j.updates
        : [];

    const allowedPaths = new Set(["/text", "/description"]);
    const normUpdates = [] as Array<{ "Target Id": string; "Roman Index"?: string; Changes: any[] }>;
    for (const u of rawUpdates) {
      if (!u || typeof u !== "object") continue;
      const targetId = u["Target Id"] ?? u["TargetID"] ?? u["TargetId"] ?? u["targetId"] ?? u["target_id"];
      if (!targetId || typeof targetId !== "string") continue;
      const romanIndex = u["Roman Index"] ?? u["roman_index"] ?? u["romanIndex"];
      const changesSrc = Array.isArray(u.Changes) ? u.Changes : Array.isArray(u.changes) ? u.changes : [];
      const changes = [] as any[];
      for (const c of changesSrc) {
        if (!c || typeof c !== "object") continue;
        const path = (c.Path ?? c.path ?? "").toString().trim();
        if (!allowedPaths.has(path)) continue;
        const opRaw = (c.Op ?? c.op ?? "replace").toString().toLowerCase();
        const Op: "replace" | "update" = opRaw === "update" ? "update" : "replace";
        const entry: any = { Path: path, Op, Value: c.Value };
        if (c.Reason ?? c.reason) entry.Reason = c.Reason ?? c.reason;
        changes.push(entry);
      }
      if (changes.length) {
        const updateEntry: any = { "Target Id": targetId, Changes: changes };
        if (romanIndex && typeof romanIndex === "string") {
          updateEntry["Roman Index"] = romanIndex;
        }
        normUpdates.push(updateEntry);
      }
    }
    out.Updates = normUpdates;

    // Changes Summary: ensure minimal object exists
    const summary = j["Changes Summary"] ?? j["changes summary"] ?? j["ChangesSummary"]; 
    if (summary && typeof summary === "object") {
      out["Changes Summary"] = summary;
    } else {
      out["Changes Summary"] = {
        "Replaced Node Title": selectedNode.text,
        "Updated Targets": normUpdates.map(u => u["Target Id"]),
      };
    }
    return out as AlternativeScopeOutput;
  };

  // Basic validation fence for presence of outline and arrays
  const normalized = normalize(parsed);
  if (!normalized.NewTaskOutline) {
    throw new Error("Missing key: New Task Outline");
  }
  if (!Array.isArray(normalized.Updates)) {
    normalized.Updates = [];
  }
  return normalized;
}
