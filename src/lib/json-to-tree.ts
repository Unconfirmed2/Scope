export type TreeNode = {
  id: number;
  /**
   * Display text shown in simple renderers (kept for backward compatibility).
   * For objects it's the key; for arrays it's like "[index]"; for primitives it's "Key: Value".
   */
  text: string;
  children: TreeNode[];
  expanded?: boolean;
  /** Human-friendly label for UI (e.g., Title Case of key). */
  displayLabel?: string;
  /** Raw key when parent is an object; undefined for array items. */
  keyRaw?: string;
  /** Index when parent is an array; undefined for object children. */
  index?: number;
  /** JSON Pointer path to this node (RFC 6901). */
  jsonPointer?: string;
  /** Node type: object | array | primitive */
  nodeType?: 'object' | 'array' | 'primitive';
  /** Raw value for primitives (string | number | boolean | null). */
  valueRaw?: string | number | boolean | null;
};

let nodeIdCounter = 0;

export function resetTreeIdCounter() {
  nodeIdCounter = 0;
}

function _toTitleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

function joinPointer(parent: string, token: string): string {
  // Escape per RFC 6901: ~ -> ~0, / -> ~1
  const escaped = token.replace(/~/g, '~0').replace(/\//g, '~1');
  if (parent === '' || parent === '/') return '/' + escaped;
  return parent + '/' + escaped;
}

export function parseJSONToTree(data: any, name = 'Root', pointer: string = '/'): TreeNode {
  const isPrimitive = (val: any) => val === null || val === undefined || typeof val !== 'object';

  const node: TreeNode = {
    id: nodeIdCounter++,
    text: String(name),
    children: [],
    expanded: true,
    // Preserve the exact key casing for objects; for array items keep index label
    displayLabel: String(name),
    jsonPointer: pointer,
  };

  if (data === null || data === undefined) {
    node.text = `${name}: null`;
    node.nodeType = 'primitive';
    node.valueRaw = null;
    return node;
  }

  if (isPrimitive(data)) {
    node.text = `${name}: ${data}`;
    node.nodeType = 'primitive';
    node.valueRaw = data as string | number | boolean;
    return node;
  }

  if (Array.isArray(data)) {
    node.nodeType = 'array';
    data.forEach((item, index) => {
      const childName = `[${index}]`;
      const childPointer = pointer === '/' ? joinPointer('', String(index)) : joinPointer(pointer, String(index));
      const child = parseJSONToTree(item, childName, childPointer);
      child.index = index;
      node.children.push(child);
    });
  } else {
    node.nodeType = 'object';
    Object.entries(data).forEach(([key, value]) => {
      const childPointer = pointer === '/' ? joinPointer('', key) : joinPointer(pointer, key);
      const child = parseJSONToTree(value, key, childPointer);
      child.keyRaw = key;
      node.children.push(child);
    });
  }

  return node;
}
