import {
  countTasksRecursively,
  countDirectSubtasks,
  calculateTaskProgress,
  calculateProjectProgress,
  sortTasks,
  sortTasksShallow,
  sortProjects,
  findTaskPath,
  findTaskRecursive,
  scanDependencies,
  countCommentsRecursively,
} from '@/lib/utils';
import type { Task, Project, SortOption, Comment } from '@/lib/types';

// Helper to create a minimal task
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    text: overrides.text ?? 'Test Task',
    completed: overrides.completed ?? false,
    status: overrides.status ?? 'todo',
    subtasks: overrides.subtasks ?? [],
    lastEdited: overrides.lastEdited ?? 1000,
    order: overrides.order ?? 0,
    parentId: overrides.parentId ?? null,
    comments: overrides.comments ?? [],
    executionResults: overrides.executionResults ?? [],
    summaries: overrides.summaries ?? [],
    source: overrides.source ?? 'manual',
    description: overrides.description ?? '',
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? 'proj-1',
    name: overrides.name ?? 'Test Project',
    tasks: overrides.tasks ?? [],
    order: overrides.order ?? 0,
    lastEdited: overrides.lastEdited ?? 1000,
    summaries: overrides.summaries ?? [],
    pinned: overrides.pinned ?? false,
    description: overrides.description ?? '',
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: overrides.id ?? 'comment-1',
    text: overrides.text ?? 'Test comment',
    timestamp: overrides.timestamp ?? 1000,
    status: overrides.status ?? 'active',
    edited: overrides.edited ?? false,
    replies: overrides.replies ?? [],
  };
}

describe('countTasksRecursively', () => {
  it('returns zero for empty array', () => {
    expect(countTasksRecursively([])).toEqual({ total: 0, completed: 0 });
  });

  it('counts only leaf tasks', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', subtasks: [] }),
      makeTask({
        id: 'b',
        status: 'todo',
        subtasks: [
          makeTask({ id: 'b1', status: 'done' }),
          makeTask({ id: 'b2', status: 'todo' }),
        ],
      }),
    ];
    // Leaves: a (done), b1 (done), b2 (todo) = total 3, completed 2
    expect(countTasksRecursively(tasks)).toEqual({ total: 3, completed: 2 });
  });
});

describe('countDirectSubtasks', () => {
  it('counts direct children only', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done' }),
      makeTask({ id: 'b', status: 'todo' }),
      makeTask({ id: 'c', status: 'done' }),
    ];
    expect(countDirectSubtasks(tasks)).toEqual({ total: 3, completed: 2 });
  });
});

describe('calculateTaskProgress', () => {
  it('returns 100 for done task with no subtasks', () => {
    expect(calculateTaskProgress(makeTask({ status: 'done' }))).toBe(100);
  });

  it('returns 0 for todo task with no subtasks', () => {
    expect(calculateTaskProgress(makeTask({ status: 'todo' }))).toBe(0);
  });

  it('calculates based on direct subtasks', () => {
    const task = makeTask({
      subtasks: [
        makeTask({ id: 'a', status: 'done' }),
        makeTask({ id: 'b', status: 'todo' }),
      ],
    });
    expect(calculateTaskProgress(task)).toBe(50);
  });
});

describe('calculateProjectProgress', () => {
  it('returns 0 for empty project', () => {
    expect(calculateProjectProgress([])).toBe(0);
  });

  it('calculates based on leaf tasks recursively', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done' }),
      makeTask({ id: 'b', status: 'todo' }),
    ];
    expect(calculateProjectProgress(tasks)).toBe(50);
  });
});

describe('sortTasks', () => {
  const tasks = [
    makeTask({ id: 'a', text: 'Bravo', status: 'done', lastEdited: 3000 }),
    makeTask({ id: 'b', text: 'Alpha', status: 'todo', lastEdited: 1000 }),
    makeTask({ id: 'c', text: 'Charlie', status: 'inprogress', lastEdited: 2000 }),
  ];

  it('sorts by name ascending', () => {
    const sorted = sortTasks(tasks, { key: 'name', direction: 'asc' });
    expect(sorted.map(t => t.text)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by name descending', () => {
    const sorted = sortTasks(tasks, { key: 'name', direction: 'desc' });
    expect(sorted.map(t => t.text)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('sorts by completion ascending', () => {
    const sorted = sortTasks(tasks, { key: 'completion', direction: 'asc' });
    expect(sorted.map(t => t.status)).toEqual(['todo', 'inprogress', 'done']);
  });

  it('sorts by edit-date ascending', () => {
    const sorted = sortTasks(tasks, { key: 'edit-date', direction: 'asc' });
    expect(sorted.map(t => t.text)).toEqual(['Alpha', 'Charlie', 'Bravo']);
  });
});

describe('sortTasksShallow', () => {
  it('does not sort children', () => {
    const tasks = [
      makeTask({
        id: 'a',
        text: 'Bravo',
        order: 1,
        subtasks: [
          makeTask({ id: 'a1', text: 'Z-child', order: 1 }),
          makeTask({ id: 'a2', text: 'A-child', order: 0 }),
        ],
      }),
      makeTask({ id: 'b', text: 'Alpha', order: 0 }),
    ];
    const sorted = sortTasksShallow(tasks, { key: 'name', direction: 'asc' });
    expect(sorted[0].text).toBe('Alpha');
    expect(sorted[1].text).toBe('Bravo');
    // Children should not be re-sorted
    expect(sorted[1].subtasks[0].text).toBe('Z-child');
    expect(sorted[1].subtasks[1].text).toBe('A-child');
  });
});

describe('sortProjects', () => {
  it('keeps unassigned first, then pinned, then sorted', () => {
    const projects = [
      makeProject({ id: 'proj-1', name: 'Zulu', pinned: false }),
      makeProject({ id: 'unassigned', name: 'Unassigned', pinned: true }),
      makeProject({ id: 'proj-2', name: 'Alpha', pinned: true }),
    ];
    const sorted = sortProjects(projects, { key: 'name', direction: 'asc' });
    expect(sorted.map(p => p.name)).toEqual(['Unassigned', 'Alpha', 'Zulu']);
  });
});

describe('findTaskPath', () => {
  const tasks = [
    makeTask({
      id: 'a',
      text: 'Parent',
      subtasks: [
        makeTask({
          id: 'b',
          text: 'Child',
          subtasks: [makeTask({ id: 'c', text: 'Grandchild' })],
        }),
      ],
    }),
  ];

  it('finds a nested task and returns the full path', () => {
    const path = findTaskPath(tasks, 'c');
    expect(path.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for non-existent task', () => {
    expect(findTaskPath(tasks, 'nonexistent')).toEqual([]);
  });

  it('returns single-element for root task', () => {
    const path = findTaskPath(tasks, 'a');
    expect(path.map(t => t.id)).toEqual(['a']);
  });
});

describe('findTaskRecursive', () => {
  const tasks = [
    makeTask({
      id: 'a',
      subtasks: [makeTask({ id: 'b' })],
    }),
  ];

  it('finds nested task', () => {
    const found = findTaskRecursive(tasks, 'b');
    expect(found?.id).toBe('b');
  });

  it('returns null for non-existent task', () => {
    expect(findTaskRecursive(tasks, 'nonexistent')).toBeNull();
  });
});

describe('scanDependencies', () => {
  const tasks = [
    makeTask({ id: 'a', text: 'Setup database', description: 'Install PostgreSQL' }),
    makeTask({
      id: 'b',
      text: 'API endpoints',
      description: 'Depends on database setup',
      subtasks: [
        makeTask({ id: 'b1', text: 'User endpoint using database' }),
      ],
    }),
  ];

  it('finds tasks mentioning a phrase', () => {
    const results = scanDependencies(tasks, 'database');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map(r => r.id)).toContain('a');
    expect(results.map(r => r.id)).toContain('b');
  });

  it('returns empty for non-matching phrase', () => {
    expect(scanDependencies(tasks, 'kubernetes')).toEqual([]);
  });

  it('deduplicates by id', () => {
    const results = scanDependencies(tasks, 'database');
    const uniqueIds = new Set(results.map(r => r.id));
    expect(uniqueIds.size).toBe(results.length);
  });
});

describe('countCommentsRecursively', () => {
  it('returns 0 for no comments', () => {
    expect(countCommentsRecursively([makeTask()])).toBe(0);
  });

  it('counts nested comments and replies', () => {
    const tasks = [
      makeTask({
        comments: [
          makeComment({
            replies: [makeComment({ id: 'reply-1' })],
          }),
        ],
        subtasks: [
          makeTask({
            id: 'sub',
            comments: [makeComment({ id: 'c2' })],
          }),
        ],
      }),
    ];
    // 1 comment + 1 reply + 1 comment on subtask = 3
    expect(countCommentsRecursively(tasks)).toBe(3);
  });
});
