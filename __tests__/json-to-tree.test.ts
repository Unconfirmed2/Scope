import { parseJSONToTree, resetTreeIdCounter, type TreeNode } from '@/lib/json-to-tree';

beforeEach(() => {
  resetTreeIdCounter();
});

// ---------------------------------------------------------------------------
// Primitive values
// ---------------------------------------------------------------------------

describe('parseJSONToTree - primitives', () => {
  it('handles null', () => {
    const tree = parseJSONToTree(null, 'NullVal');
    expect(tree.text).toBe('NullVal: null');
    expect(tree.nodeType).toBe('primitive');
    expect(tree.valueRaw).toBeNull();
    expect(tree.children).toEqual([]);
  });

  it('handles undefined', () => {
    const tree = parseJSONToTree(undefined, 'Undef');
    expect(tree.text).toBe('Undef: null');
    expect(tree.nodeType).toBe('primitive');
  });

  it('handles a string', () => {
    const tree = parseJSONToTree('hello', 'Greeting');
    expect(tree.text).toBe('Greeting: hello');
    expect(tree.nodeType).toBe('primitive');
    expect(tree.valueRaw).toBe('hello');
  });

  it('handles a number', () => {
    const tree = parseJSONToTree(42, 'Answer');
    expect(tree.text).toBe('Answer: 42');
    expect(tree.nodeType).toBe('primitive');
    expect(tree.valueRaw).toBe(42);
  });

  it('handles a boolean', () => {
    const tree = parseJSONToTree(true, 'Flag');
    expect(tree.text).toBe('Flag: true');
    expect(tree.nodeType).toBe('primitive');
    expect(tree.valueRaw).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

describe('parseJSONToTree - objects', () => {
  it('parses a flat object', () => {
    const tree = parseJSONToTree({ name: 'Alice', age: 30 }, 'Person');
    expect(tree.nodeType).toBe('object');
    expect(tree.text).toBe('Person');
    expect(tree.children).toHaveLength(2);

    const nameChild = tree.children[0];
    expect(nameChild.text).toBe('name: Alice');
    expect(nameChild.keyRaw).toBe('name');
    expect(nameChild.nodeType).toBe('primitive');
    expect(nameChild.valueRaw).toBe('Alice');

    const ageChild = tree.children[1];
    expect(ageChild.text).toBe('age: 30');
    expect(ageChild.keyRaw).toBe('age');
    expect(ageChild.valueRaw).toBe(30);
  });

  it('parses nested objects', () => {
    const data = {
      user: {
        profile: {
          name: 'Bob',
        },
      },
    };
    const tree = parseJSONToTree(data, 'Root');
    expect(tree.nodeType).toBe('object');
    const userNode = tree.children[0];
    expect(userNode.keyRaw).toBe('user');
    expect(userNode.nodeType).toBe('object');
    const profileNode = userNode.children[0];
    expect(profileNode.keyRaw).toBe('profile');
    const nameNode = profileNode.children[0];
    expect(nameNode.text).toBe('name: Bob');
  });

  it('handles an empty object', () => {
    const tree = parseJSONToTree({}, 'Empty');
    expect(tree.nodeType).toBe('object');
    expect(tree.children).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

describe('parseJSONToTree - arrays', () => {
  it('parses a simple array', () => {
    const tree = parseJSONToTree([1, 2, 3], 'Numbers');
    expect(tree.nodeType).toBe('array');
    expect(tree.children).toHaveLength(3);
    expect(tree.children[0].text).toBe('[0]: 1');
    expect(tree.children[0].index).toBe(0);
    expect(tree.children[1].text).toBe('[1]: 2');
    expect(tree.children[2].text).toBe('[2]: 3');
  });

  it('parses an array of objects', () => {
    const data = [{ key: 'a' }, { key: 'b' }];
    const tree = parseJSONToTree(data, 'Items');
    expect(tree.nodeType).toBe('array');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].nodeType).toBe('object');
    expect(tree.children[0].children[0].text).toBe('key: a');
  });

  it('handles an empty array', () => {
    const tree = parseJSONToTree([], 'Empty');
    expect(tree.nodeType).toBe('array');
    expect(tree.children).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// JSON Pointers
// ---------------------------------------------------------------------------

describe('parseJSONToTree - JSON pointers', () => {
  it('assigns correct pointers for object keys', () => {
    const tree = parseJSONToTree({ foo: { bar: 'baz' } }, 'Root');
    expect(tree.jsonPointer).toBe('/');
    const fooNode = tree.children[0];
    expect(fooNode.jsonPointer).toBe('/foo');
    const barNode = fooNode.children[0];
    expect(barNode.jsonPointer).toBe('/foo/bar');
  });

  it('assigns correct pointers for array indices', () => {
    const tree = parseJSONToTree(['a', 'b'], 'Root');
    expect(tree.children[0].jsonPointer).toBe('/0');
    expect(tree.children[1].jsonPointer).toBe('/1');
  });

  it('escapes special characters in pointer tokens', () => {
    const tree = parseJSONToTree({ 'a/b': 'val', 'c~d': 'val2' }, 'Root');
    const slashChild = tree.children[0];
    expect(slashChild.jsonPointer).toBe('/a~1b');
    const tildeChild = tree.children[1];
    expect(tildeChild.jsonPointer).toBe('/c~0d');
  });
});

// ---------------------------------------------------------------------------
// ID counter
// ---------------------------------------------------------------------------

describe('resetTreeIdCounter', () => {
  it('resets IDs so they start from 0 again', () => {
    const tree1 = parseJSONToTree('a', 'First');
    expect(tree1.id).toBe(0);

    const tree2 = parseJSONToTree('b', 'Second');
    expect(tree2.id).toBe(1);

    resetTreeIdCounter();

    const tree3 = parseJSONToTree('c', 'Third');
    expect(tree3.id).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Common properties
// ---------------------------------------------------------------------------

describe('parseJSONToTree - common properties', () => {
  it('sets expanded to true on all nodes', () => {
    const tree = parseJSONToTree({ a: [1, 2] }, 'Root');
    expect(tree.expanded).toBe(true);
    expect(tree.children[0].expanded).toBe(true);
    expect(tree.children[0].children[0].expanded).toBe(true);
  });

  it('sets displayLabel from the name parameter', () => {
    const tree = parseJSONToTree('val', 'My Label');
    expect(tree.displayLabel).toBe('My Label');
  });
});
