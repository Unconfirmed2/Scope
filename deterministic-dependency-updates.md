
# Deterministic Dependency Updates for “Alternative Scope”
**Status:** Draft • **Owner:** Engineering • **Target:** Scope repo (`/`)  
**Goal:** When a user generates an *Alternative* for a node (e.g., swaps “Caprese Skewers” → “Stuffed Mushrooms”), *all* dependent sections (Cooking Instructions, Shopping List, Timeline, etc.) are updated deterministically — without relying on the model to “notice” them.

---

## Why
Today, the Alternative flow replaces the selected node, but downstream branches only update if the AI proposes patches. That leaves stale dependents (e.g., “Caprese Skewers” still appearing under **Cooking Instructions**). We want a guaranteed pipeline that refreshes all dependents of the replaced item.

---

## Design Overview
1. **Explicit dependency links:** Add `role` and optional `forId` to nodes so dependents can be targeted deterministically.
2. **Deterministic dependency scanner:** Given a changed node, collect dependents by `forId`/`role` and via fuzzy fallbacks (text tokens).
3. **Post-accept Alternative hook:** After applying the replacement, automatically **regenerate** the dependent clusters (instructions, shopping, timeline).
4. **Stricter Alternative prompt contract:** Provide the model a *candidate list* of nodes to patch and require it to either patch or explicitly skip each one (with a reason). Limit model patches to simple `/text` & `/description` updates; use **regenerate** for structured rewrites.
5. **(Optional) Project variables:** A light `vars` layer (e.g., `vars.menu.appetizerName`) to eliminate name drift in labels.
6. **UI signals:** Show a badge like “Updating…/Updated” on dependents while regeneration runs.

---

## Data Model Additions
```ts
// types/scope.ts
export type ScopeNode = {
  id: string;
  text: string;              // human label/title
  description?: string;
  role?: string;             // e.g., "menu.appetizer", "instructions.appetizer", "shopping.appetizer"
  forId?: string;            // id of the node this one depends on (if any)
  children: ScopeNode[];
  // ...existing fields
};
```

### Role conventions (initial set)
- `menu.appetizer` | `menu.main` | `menu.dessert`
- `instructions.appetizer` | `instructions.main` | `instructions.dessert`
- `shopping.appetizer` | `shopping.main` | `shopping.dessert`
- `timeline.appetizer` | `timeline.main` | `timeline.dessert`

> **Migration**: backfill `role`/`forId` on existing nodes using path heuristics (see **Role Inference** below).

---

## Dependency Discovery
Create a deterministic scanner that returns all dependents of a changed node. Prefer `forId` links; fall back to token-based matches.

```ts
// src/lib/deps.ts
export function traverse(root: ScopeNode, visit: (n: ScopeNode, path: ScopeNode[]) => void) {
  const stack: Array<{node: ScopeNode, path: ScopeNode[]}> = [{ node: root, path: [] }];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    visit(node, path);
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push({ node: node.children[i], path: path.concat(node) });
    }
  }
}

export function findDependents(root: ScopeNode, changed: ScopeNode) {
  const hits: ScopeNode[] = [];
  const targetId = changed.id;
  const tokens = changed.text.toLowerCase().split(/\W+/).filter(w => w.length >= 4);
  traverse(root, (n) => {
    const isRoleLink = n.forId === targetId;
    const tokenMatch = !isRoleLink && tokens.some(t =>
      n.text?.toLowerCase().includes(t) || n.description?.toLowerCase().includes(t)
    );
    if (isRoleLink || tokenMatch) hits.push(n);
  });
  return hits;
}

export function collectCandidates(root: ScopeNode, changed: ScopeNode) {
  const direct = findDependents(root, changed);
  const plusSiblings = new Set<ScopeNode>(direct);
  direct.forEach(d => (d.children ?? []).forEach(c => plusSiblings.add(c)));
  return Array.from(plusSiblings);
}
```

---

## Post-Accept Hook for Alternative
After applying the AI result (replace + text patches), automatically regenerate dependent clusters by role.

```ts
// src/flows/alternative/applyWithDeps.ts
import { collectCandidates } from "@/lib/deps";
import { regenerate } from "@/flows/regenerate";

export async function applyAlternativeWithDeps(project: Project, changedNode: ScopeNode, aiResult: AlternativeResult) {
  // 1) Apply replacement + AI patches (existing logic)
  applyAlternativeResult(project, aiResult);

  // 2) Collect dependents deterministically
  const candidates = collectCandidates(project.root, changedNode);

  // 3) Group by role and schedule regenerations
  const groups = new Map<string, ScopeNode[]>();
  for (const n of candidates) {
    const key = n.role ?? "unknown";
    const arr = groups.get(key) ?? [];
    arr.push(n);
    groups.set(key, arr);
  }

  // Re-gen instructions/shopping/timeline that map to this source
  await Promise.all([
    ...(groups.get("instructions.appetizer") ?? []).map(n => regenerate({ targetId: n.id, inputs: { dishName: changedNode.text } })),
    ...(groups.get("shopping.appetizer") ?? []).map(n => regenerate({ targetId: n.id, inputs: { dishName: changedNode.text } })),
    ...(groups.get("timeline.appetizer") ?? []).map(n => regenerate({ targetId: n.id, inputs: { dishName: changedNode.text } })),
    // repeat pattern for main/dessert roles or compute role family from changed.role
  ]);

  // 4) Optionally run a final lightweight text patch pass for any fuzzy-only hits not linked via forId.
}
```

> **Note:** Decide role family (appetizer/main/dessert) based on `changed.role` or path. If unknown, generate for all *instructions/shopping/timeline* whose `forId === changed.id`.

---

## Alternative Flow Prompt Update
### Contract
- Return **three blocks**: `<NewTaskOutline/>`, `<Patches/>`, `<ChangesSummary/>`.
- **Scope of Patches:** only `/text` and `/description` fields of existing nodes (by id).
- **Candidates:** The system provides `<Candidates/>` (list of node ids) that **must** be addressed with either a patch or a skip.
- **SkippedIds:** If a candidate isn’t modified, list it in `<SkippedIds/>` with a single-line reason.

### Prompt skeleton (server)
```xml
<task>ALTERNATIVE_REPLACEMENT</task>
<rules>
- You are replacing one node with an alternative and preparing minimal patches for dependents.
- Output EXACTLY three sections: <NewTaskOutline/>, <Patches/>, <ChangesSummary/>.
- Patches may only modify /text and /description of existing nodes by id.
- You MUST address every id in <Candidates/> by either supplying a patch or listing it under <SkippedIds/> with a reason.
</rules>

<context>
<ProjectJSON>…(pruned project)…</ProjectJSON>
<ReplacedNode id="{CHANGED_ID}">
  <OldTitle>Caprese Skewers</OldTitle>
  <NewTitle>Stuffed Mushrooms With Herb Cream Cheese</NewTitle>
</ReplacedNode>
<Candidates>
  <Id>cook-inst-123</Id>
  <Id>shop-456</Id>
  <!-- more -->
</Candidates>
</context>
```

---

## Regenerate Prompts (dependents)
Keep these simple and targeted; they consume `dishName` and return a subtree.

**Instructions (Appetizer)**
```xml
<task>REGENERATE_INSTRUCTIONS</task>
<rules>
- Produce a concise, stepwise instruction subtree for the dish.
- Include 1-2 nested sub-steps where helpful (e.g., "Prepare Filling", "Bake").
- Avoid unrelated ingredients or references to prior dishes.
</rules>
<inputs>
  <dishName>Stuffed Mushrooms With Herb Cream Cheese</dishName>
</inputs>
<output>JSON subtree with {text, description?, children[]}</output>
```

**Shopping (Appetizer)**
```xml
<task>REGENERATE_SHOPPING</task>
<rules>
- List ingredients (with quantities) required for the dish only.
- Group by sections (Produce, Dairy, Pantry) if possible.
</rules>
<inputs>
  <dishName>Stuffed Mushrooms With Herb Cream Cheese</dishName>
</inputs>
<output>JSON subtree with items as children</output>
```

---

## Role Inference (Backfill)
If existing projects lack roles/links, infer once and persist:
```ts
// src/lib/roleInference.ts
export function inferRoleFromPath(pathLabels: string[], node: ScopeNode): string | undefined {
  const p = pathLabels.join(" > ").toLowerCase();
  const t = node.text.toLowerCase();
  if (p.includes("menu selection") && t.startsWith("appetizer")) return "menu.appetizer";
  if (p.includes("cooking instructions") && t.includes("appetizer")) return "instructions.appetizer";
  if (p.includes("shopping list") && t.includes("appetizer")) return "shopping.appetizer";
  if (p.includes("preparation timeline") && t.includes("appetizer")) return "timeline.appetizer";
  return undefined;
}
```

---

## UI
- When an Alternative is accepted, display a toast: “Updating 3 dependent sections…”
- Badge dependents: **Updating…** → **Updated** when regeneration completes.
- Provide a diff/summary popover using `<ChangesSummary/>`.

---

## Copilot TODOs (bite-sized)
- [ ] Add `role` and `forId` fields to `ScopeNode` type.
- [ ] Implement `traverse`, `findDependents`, and `collectCandidates` in `src/lib/deps.ts`.
- [ ] Add `inferRoleFromPath` and a one-time backfill script in `scripts/backfill-roles.ts`.
- [ ] Extend Alternative accept handler (`applyAlternativeWithDeps`) to schedule regenerations.
- [ ] Create regenerate flows for `instructions.*`, `shopping.*`, `timeline.*` (dishName input).
- [ ] Update server Alternative prompt to include `<Candidates/>` and enforce skip/patch contract.
- [ ] Add UI badges for in-progress updates.
- [ ] Add unit tests for `findDependents` and integration tests for the Alternative pipeline.

---

## Testing & Acceptance
**Unit**
- Given a changed appetizer node, `findDependents` returns all nodes with `forId=changed.id` plus token matches.
- Fuzzy-only nodes are secondary and do not block regeneration of `forId`-linked dependents.

**Integration**
- Replace “Caprese Skewers” with “Stuffed Mushrooms”:
  - “Cooking Instructions (Appetizer)” subtree is fully regenerated and mentions **no Caprese** tokens.
  - “Shopping List (Appetizer)” subtree updated to mushroom ingredients.
  - UI shows “Updated” badges.

**Non-regression**
- Alternative for **Main Course** only regenerates `instructions.main`, `shopping.main`, `timeline.main`.
- If model returns an empty `Patches`, dependents still update due to deterministic regeneration.

---

## Failure & Fallbacks
- If regeneration fails, keep previous subtree but display a warning and offer “Retry Regeneration” action.
- For fuzzy-only candidates, run a final text-replace patch if safe (guard by review or diff threshold).

---

## Future Enhancements
- Replace token-based fuzzy with embedding-based match on the client (optional, gated).
- Introduce variable substitution (`${vars.menu.appetizerName}`) for labels.
- Visual dependency graph editor for power users.

---

## Suggested File Layout
```
src/
  lib/
    deps.ts
    roleInference.ts
  flows/
    alternative/
      applyWithDeps.ts
    regenerate/
      instructions.ts
      shopping.ts
      timeline.ts
scripts/
  backfill-roles.ts
types/
  scope.ts
docs/
  deterministic-dependency-updates.md (this file)
```

---

## Notes for Implementers
- Keep **model prompts minimal**; deterministic logic should live in code.
- Preserve node `id`s across replacements; set `forId` on dependent sections to the source node’s `id`.
- Prefer **full subtree regenerate** for instructions/shopping/timeline instead of trying to micro-patch them.

