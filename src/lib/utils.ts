

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
