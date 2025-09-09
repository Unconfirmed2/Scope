

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Task, SortOption, Comment, Project } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function countTasksRecursively(tasks: Task[]): { total: number, completed: number } {
    let total = 0;
    let completed = 0;

    const counter = (task_list: Task[]) => {
        for (const task of task_list) {
            // Only count tasks that don't have subtasks as 'items' to be completed
            if (!task.subtasks || task.subtasks.length === 0) {
                total++;
                if (task.status === 'done') {
                    completed++;
                }
            }
            if (task.subtasks && task.subtasks.length > 0) {
                counter(task.subtasks);
            }
        }
    };
    
    counter(tasks);
    return { total, completed };
}

export function countDirectSubtasks(tasks: Task[]): { total: number, completed: number } {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    return { total, completed };
}


export function calculateTaskProgress(task: Task): number {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.status === 'done' ? 100 : 0;
    }
    const { completed, total } = countDirectSubtasks(task.subtasks);
    return total > 0 ? (completed / total) * 100 : 0;
}

export function calculateProjectProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    // Use the recursive count for a more accurate project-wide progress
    const { completed, total } = countTasksRecursively(tasks);
    return total > 0 ? (completed / total) * 100 : 0;
}

function calculateTaskComplexity(task: Task): number {
    let complexity = 1; // Count the task itself
    if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
            complexity += calculateTaskComplexity(subtask);
        }
    }
    return complexity;
}

function calculateProjectComplexity(project: Project): number {
    return project.tasks.reduce((acc, task) => acc + calculateTaskComplexity(task), 0);
}

export function sortTasks(tasks: Task[], option: SortOption, opts?: { recursive?: boolean }): Task[] {
  const sortedTasks = [...tasks];
  const directionMultiplier = option.direction === 'asc' ? 1 : -1;

  switch(option.key) {
    case 'completion':
      sortedTasks.sort((a, b) => {
        const statusOrder = { 'todo': 0, 'inprogress': 1, 'done': 2 };
        return (statusOrder[a.status] - statusOrder[b.status]) * directionMultiplier;
      });
      break;
    case 'complexity':
      sortedTasks.sort((a, b) => (calculateTaskComplexity(a) - calculateTaskComplexity(b)) * directionMultiplier);
      break;
    case 'edit-date':
      sortedTasks.sort((a, b) => (a.lastEdited - b.lastEdited) * directionMultiplier);
      break;
    case 'name':
       sortedTasks.sort((a, b) => a.text.localeCompare(b.text) * directionMultiplier);
       break;
    default: // Default to order property if key is not recognized
        sortedTasks.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) * directionMultiplier);
        break;
  }
  
    // Recursively sort subtasks only if requested
    if (opts?.recursive) {
        return sortedTasks.map(task => ({
            ...task,
            subtasks: task.subtasks && task.subtasks.length > 0 ? sortTasks(task.subtasks, option, opts) : []
        }));
    }
    return sortedTasks;
}

// Shallow sort: only sort the provided list; leave children as-is without recursive sorting
export function sortTasksShallow(tasks: Task[], option: SortOption): Task[] {
    const sortedTasks = [...tasks];
    const directionMultiplier = option.direction === 'asc' ? 1 : -1;

    switch(option.key) {
        case 'completion':
            sortedTasks.sort((a, b) => {
                const statusOrder = { 'todo': 0, 'inprogress': 1, 'done': 2 } as const;
                return (statusOrder[a.status] - statusOrder[b.status]) * directionMultiplier;
            });
            break;
        case 'complexity':
            sortedTasks.sort((a, b) => (calculateTaskComplexity(a) - calculateTaskComplexity(b)) * directionMultiplier);
            break;
        case 'edit-date':
            sortedTasks.sort((a, b) => (a.lastEdited - b.lastEdited) * directionMultiplier);
            break;
        case 'name':
            sortedTasks.sort((a, b) => a.text.localeCompare(b.text) * directionMultiplier);
            break;
        default:
            sortedTasks.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) * directionMultiplier);
            break;
    }

    return sortedTasks;
}

export function sortProjects(projects: Project[], option: SortOption): Project[] {
  const unassignedProject = projects.find(p => p.id === 'unassigned');
  const otherProjects = projects.filter(p => p.id !== 'unassigned');

  const directionMultiplier = option.direction === 'asc' ? 1 : -1;

  switch(option.key) {
    case 'name':
      otherProjects.sort((a, b) => a.name.localeCompare(b.name) * directionMultiplier);
      break;
    case 'edit-date':
      otherProjects.sort((a, b) => (a.lastEdited - b.lastEdited) * directionMultiplier);
      break;
    case 'completion':
        otherProjects.sort((a,b) => (calculateProjectProgress(a.tasks) - calculateProjectProgress(b.tasks)) * directionMultiplier);
        break;
    case 'complexity':
        otherProjects.sort((a,b) => (calculateProjectComplexity(a) - calculateProjectComplexity(b)) * directionMultiplier);
        break;
    default: // Default to alphabetical
      otherProjects.sort((a, b) => a.name.localeCompare(b.name) * directionMultiplier);
      break;
  }
  
  const pinnedProjects = otherProjects.filter(p => p.pinned);
  const nonPinnedProjects = otherProjects.filter(p => !p.pinned);

  const finalProjects = [];
  if (unassignedProject) {
      finalProjects.push(unassignedProject);
  }
  finalProjects.push(...pinnedProjects, ...nonPinnedProjects);
  
  return finalProjects;
}


export function findTaskPath(tasks: Task[], taskId: string, options?: { sort?: boolean, sortOption?: SortOption }): Task[] {
    const tasksToSearch = options?.sort && options?.sortOption ? sortTasks(tasks, options.sortOption, { recursive: false }) : tasks;
    
    for (const task of tasksToSearch) {
        if (task.id === taskId) {
            return [task];
        }
        if (task.subtasks) {
            const path = findTaskPath(task.subtasks, taskId, options);
            if (path.length > 0) {
                return [task, ...path];
            }
        }
    }
    return [];
}

export function findTaskRecursive(tasks: Task[], taskId: string): Task | null {
    for (const task of tasks) {
        if (task.id === taskId) {
            return task;
        }
        if (task.subtasks) {
            const found = findTaskRecursive(task.subtasks, taskId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

    // Enhanced dependency scan: find nodes whose text/description/executionResults/summaries/comments mention the given phrase (case-insensitive)
    export function scanDependencies(tasks: Task[], phrase: string): { id: string; path: string; text?: string; description?: string }[] {
        const results: { id: string; path: string; text?: string; description?: string }[] = [];
        const stack: { node: Task; path: string[] }[] = tasks.map(t => ({ node: t, path: [t.text] }));
        const lower = phrase.trim().toLowerCase();
        
        while (stack.length) {
            const { node, path } = stack.pop()!;
            
            // Check text and description (existing functionality)
            const inText = node.text?.toLowerCase().includes(lower);
            const inDesc = (node.description || '').toLowerCase().includes(lower);
            
            // Check execution results
            const inExecutionResults = (node.executionResults || []).some(result => 
                result.resultText?.toLowerCase().includes(lower)
            );
            
            // Check summaries
            const inSummaries = (node.summaries || []).some(summary => 
                summary.text?.toLowerCase().includes(lower)
            );
            
            // Check comments recursively
            const checkCommentsForPhrase = (comments: Comment[]): boolean => {
                return comments.some(comment => {
                    const commentMatch = comment.text?.toLowerCase().includes(lower);
                    const repliesMatch = comment.replies ? checkCommentsForPhrase(comment.replies) : false;
                    return commentMatch || repliesMatch;
                });
            };
            const inComments = checkCommentsForPhrase(node.comments || []);
            
            if (inText || inDesc || inExecutionResults || inSummaries || inComments) {
                results.push({ id: node.id, path: path.join(' > '), text: node.text, description: node.description });
            }
            
            if (node.subtasks && node.subtasks.length) {
                for (const c of node.subtasks) stack.push({ node: c, path: [...path, c.text] });
            }
        }
        // De-duplicate by id
        const seen = new Set<string>();
        return results.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    }

// Roman numeral utilities for stable indexing
export function toRomanNumeral(num: number): string {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    
    let result = '';
    for (let i = 0; i < values.length; i++) {
        const count = Math.floor(num / values[i]);
        if (count > 0) {
            result += numerals[i].repeat(count);
            num -= values[i] * count;
        }
    }
    return result;
}

export function fromRomanNumeral(roman: string): number {
    const values: Record<string, number> = {
        'M': 1000, 'CM': 900, 'D': 500, 'CD': 400, 'C': 100, 'XC': 90,
        'L': 50, 'XL': 40, 'X': 10, 'IX': 9, 'V': 5, 'IV': 4, 'I': 1
    };
    
    let result = 0;
    let i = 0;
    const romanUpper = roman.toUpperCase();
    
    while (i < romanUpper.length) {
        if (i + 1 < romanUpper.length && values[romanUpper.substring(i, i + 2)]) {
            result += values[romanUpper.substring(i, i + 2)];
            i += 2;
        } else {
            result += values[romanUpper[i]];
            i += 1;
        }
    }
    return result;
}

// Stable indexing pass that assigns Roman numeral labels to nodes
export function assignRomanNumeralIndices(tasks: Task[]): Map<string, string> {
    const indexMap = new Map<string, string>();
    let counter = 1;
    
    const traverse = (taskList: Task[]) => {
        for (const task of taskList) {
            indexMap.set(task.id, toRomanNumeral(counter));
            counter++;
            if (task.subtasks && task.subtasks.length > 0) {
                traverse(task.subtasks);
            }
        }
    };
    
    traverse(tasks);
    return indexMap;
}

// Reverse mapping from Roman numeral to task ID
export function createRomanToIdMap(indexMap: Map<string, string>): Map<string, string> {
    const reverseMap = new Map<string, string>();
    for (const [taskId, roman] of indexMap.entries()) {
        reverseMap.set(roman, taskId);
    }
    return reverseMap;
}

function countCommentsInList(comments: Comment[]): number {
    let count = 0;
    for (const comment of comments) {
        count++;
        if (comment.replies && comment.replies.length > 0) {
            count += countCommentsInList(comment.replies);
        }
    }
    return count;
}

export function countCommentsRecursively(tasks: Task[]): number {
    let count = 0;
    for (const task of tasks) {
        if (task.comments && task.comments.length > 0) {
            count += countCommentsInList(task.comments);
        }
        if (task.subtasks && task.subtasks.length > 0) {
            count += countCommentsRecursively(task.subtasks);
        }
    }
    return count;
}
