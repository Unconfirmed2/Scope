'use server';
/**
 * JSON-first nested outline generator.
 * - Prompts the model to return a single valid JSON object with exactly one Title Case root key.
 * - Keys must be human-readable Title Case; underscores forbidden.
 * - Parses JSON directly when present; gracefully falls back to indentation parsing if JSON is missing.
 */

import { generateContentBlocks } from '@/ai/claude';
import { parseJSONToTree, resetTreeIdCounter, type TreeNode } from '@/lib/json-to-tree';

// Minimal types re-exported for UI compatibility (not enforced at runtime)
export type GenerateTaskStepsInput = {
    goal: string;
    userInput?: string;
    projectName?: string;
    existingTasks?: string[];
    photoDataUri?: string;
};

export type GenerateTaskStepsOutput = {
    // The raw structure returned by the AI. Prefer the original JSON without normalization.
    raw: any;
    // Optional tree representation derived from raw JSON (if available) or fallback.
    tree?: TreeNode;
};

// ---------- Parsing helpers (indentation-first) ----------

function stripCodeFences(s: string): string {
    const m = s.match(/```(?:json)?\n([\s\S]*?)```/i);
    return m ? m[1].trim() : s.trim();
}

function tryParseJsonObject(s: string): any | null {
    try {
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
            const candidate = s.slice(first, last + 1);
            return JSON.parse(candidate);
        }
        return JSON.parse(s);
    } catch {
        return null;
    }
}

function toLinesForIndentParsing(input: any): string[] {
    // If it's already text, return lines; if it's JSON, pretty-print to a nested outline-like form
    if (typeof input === 'string') {
        return input.replace(/\r/g, '').split('\n');
    }
    try {
        return JSON.stringify(input, null, 2).split('\n');
    } catch {
        return [];
    }
}

function detectIndentWidth(lines: string[]): number {
    const indents: number[] = [];
    for (const ln of lines) {
        if (!ln.trim()) continue;
        const m = ln.match(/^(\s+)/);
        if (m) indents.push(m[1].replace(/\t/g, '  ').length);
    }
    const uniq = Array.from(new Set(indents.filter(n => n > 0))).sort((a, b) => a - b);
    if (uniq.length === 0) return 2;
    // Choose the smallest non-zero as base indent
    return uniq[0];
}

function cleanBullet(text: string): string {
    return text
        .replace(/^\s*[-*+•]\s+/, '')
        .replace(/^\s*\d+[.)]\s+/, '')
        .replace(/^\s*[A-Za-z][.)]\s+/, '')
        .replace(/^\s*[ivxlcdm]+[.)]\s+/i, '')
        .trim();
}

type Node = { title: string; content: string[]; children: Node[]; level: number };

function parseByIndentation(textOrJson: string | object): Node[] {
    const lines = toLinesForIndentParsing(textOrJson);
    if (lines.length === 0) return [];

    const base = detectIndentWidth(lines);
    const stack: Node[] = [];
    const roots: Node[] = [];

    for (let raw of lines) {
        if (!raw.trim()) continue;
        const line = raw.replace(/\t/g, '  ');
        const m = line.match(/^(\s*)(.*)$/);
        if (!m) continue;
        const indent = m[1].length;
        const level = Math.floor(indent / base);
        let text = m[2].trim();
        if (!text) continue;

        // Ignore JSON punctuation-only lines
        if (/^[{}\[\],:]$/.test(text)) continue;

        // Trim trailing commas (from pretty JSON) and quotes
        text = text.replace(/[,\s]*$/, '');
        text = text.replace(/^"|"$/g, '');
        // If it's a JSON key line like: key: value or "key": value
        const keyVal = text.match(/^"?([^":]+)"?\s*:\s*(.*)$/);
        if (keyVal) {
            const key = keyVal[1].trim();
            const val = keyVal[2].trim();
            if (val && val !== '{' && val !== '[') {
                // Treat as heading with bullet content when scalar
                const node: Node = { title: key, content: [val.replace(/^"|"$/g, '')], children: [], level };
                placeNode(node, roots, stack);
                continue;
            } else {
                const node: Node = { title: key, content: [], children: [], level };
                placeNode(node, roots, stack);
                continue;
            }
        }

        // Otherwise treat as bullet text
        const cleaned = cleanBullet(text);
        const node: Node = { title: cleaned, content: [], children: [], level };
        placeNode(node, roots, stack);
    }

    // Heuristic: convert leaf children that look like bullets under a section (e.g., Ingredients)
    const headingLike = /ingredients|preparation|steps|notes|materials|tools|timing|service|requirements|checklist/i;
    const normalizeContent = (n: Node) => {
        if (n.children.length > 0) {
            // If children are all leaves (no grandchildren) and title looks like a heading, make them content
            const allLeaves = n.children.every(c => c.children.length === 0);
            if (allLeaves && headingLike.test(n.title)) {
                n.content.push(...n.children.map(c => c.title));
                n.children = [];
            } else {
                n.children.forEach(normalizeContent);
            }
        }
    };
    roots.forEach(normalizeContent);

    return roots;
}

function placeNode(node: Node, roots: Node[], stack: Node[]) {
    while (stack.length && stack[stack.length - 1].level >= node.level) {
        stack.pop();
    }
    if (stack.length === 0) {
        roots.push(node);
    } else {
        stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
}

// Convert the indentation nodes into a plain nested structure for fallback only
function nodesToPlain(nodes: Node[]): any[] {
    const map = (n: Node): any => ({
        title: n.title,
        ...(n.content.length ? { content: n.content } : {}),
        ...(n.children.length ? { children: n.children.map(map) } : {}),
    });
    return nodes.map(map);
}

function deriveSynthesis(nodes: Node[]): string | undefined {
    // Find a node named like a conclusion and gather its leaf text
    const isSynthesisTitle = (t: string) => /^(synthesis|summary|conclusion|overall|takeaways|notes)$/i.test(t.trim());
    const queue = [...nodes];
    let chosen: Node | undefined;
    while (queue.length) {
        const n = queue.shift()!;
        if (isSynthesisTitle(n.title)) chosen = n; // prefer last match
        queue.push(...n.children);
    }
    if (!chosen) return undefined;
    const acc: string[] = [];
    const dfs = (n: Node) => {
        if (n.content.length) acc.push(...n.content);
        if (n.children.length === 0 && n.content.length === 0) acc.push(n.title);
        n.children.forEach(dfs);
    };
    dfs(chosen);
    return acc.join('\n').trim() || undefined;
}

// ---------- Main flow ----------

async function generateTaskStepsFlow(input: GenerateTaskStepsInput): Promise<GenerateTaskStepsOutput> {
    // Updated system prompt per formatting and depth requirements
    const systemPrompt = `<rules>
You are an advanced AI assistant tasked with analyzing and/or executing a wide variety of tasks by breaking the prompt down into its component parts and analyzing and executing them recursively. Think step-by-step. After receiving results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action. Analyze and expand children tasks if necessary. Go as broad or as deep as needed. You produce a structured, nested OUTLINE in pure JSON (no prose). There must be exactly one root key.

<formatting>
- Use one top-level root key that summarizes the task (e.g., "3 Course Meal For 6").
- Under the root, each object key is a readable heading.
- Key Casing: All keys—including the root—MUST be Title Case (capitalize major words).
- No Underscores: Underscores are forbidden in all keys. Replace with spaces.
- Valid JSON only. Output a single JSON object. Do not include code fences, comments, or trailing commas.
</formatting>

<depth_rule>
- Do not stop expanding until leaves are atomic items/factors
</depth_rule>

<collapsing_rule>
- If a parent heading is merely a category/label for exactly one concrete child, MERGE them into one heading: "<category>: <child title>" and lift the child's properties under that merged heading.
- If a category has two or more concrete children, keep the category as the parent and list children normally.
</collapsing_rule>

<output_format>
- JSON only. Output must be exactly one JSON object with a single root key. No code fences, no prose.
- Keys should be human-readable; values may be objects, arrays, or strings.
</output_format>
</rules>`;

        let userPrompt = `<request>
    <goal>${input.goal}</goal>
    ${input.userInput ? `<user_instructions>${input.userInput}</user_instructions>` : ''}
    ${input.photoDataUri ? `<image_present>true</image_present>` : ''}
    ${input.projectName ? `<project_name>${input.projectName}</project_name>` : ''}
    ${input.existingTasks?.length ? `<existing_tasks>${input.existingTasks.map(t=>`<task>${t}</task>`).join('')}</existing_tasks>` : ''}
    <return_format>JSON-only, exactly one root key, no code fences</return_format>
</request>`;

    const response = await generateContentBlocks({
        system: [{ text: systemPrompt, cache: true }],
        user: [{ text: userPrompt, cache: false }],
        maxTokens: 4000,
        temperature: 0.2,
    });
    const unfenced = stripCodeFences(response);

    // Try JSON first, but don't enforce a schema; convert to indent-like tree for consistency
    const json = tryParseJsonObject(unfenced);
    if (json) {
        // Return the original JSON as-is, plus a derived tree using the provided utility.
        // If the root is a single-key object, use that key as the tree root heading.
        const escapeToken = (t: string) => t.replace(/~/g, "~0").replace(/\//g, "~1");
        resetTreeIdCounter();
        let tree: TreeNode;
        if (json && typeof json === 'object' && !Array.isArray(json)) {
            const keys = Object.keys(json);
            if (keys.length === 1) {
                const rootKey = keys[0];
                const pointer = '/' + escapeToken(rootKey);
                tree = parseJSONToTree((json as any)[rootKey], rootKey, pointer);
            } else {
                tree = parseJSONToTree(json, 'Root');
            }
        } else {
            tree = parseJSONToTree(json, 'Root');
        }
        return { raw: json, tree };
    }

    // Fallback: parse indentation from text/bullets
    const nodes = parseByIndentation(unfenced);
    const plain = nodesToPlain(nodes);
    // Build a tree from the plain structure for consistency
    resetTreeIdCounter();
    const tree = parseJSONToTree(plain, 'Root');
    return { raw: plain, tree };
}

export async function generateTaskSteps(input: GenerateTaskStepsInput): Promise<GenerateTaskStepsOutput> {
    return generateTaskStepsFlow(input);
}
