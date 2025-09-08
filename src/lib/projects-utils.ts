import type { Project, Task, TaskStatus, Comment } from '@/lib/types';
import { findTaskPath } from '@/lib/utils';

export const initialUnassignedProject: Project = {
    id: 'unassigned',
    name: 'Unassigned',
    description: 'Scopes that have not been assigned to a specific folder.',
    tasks: [],
    lastEdited: Date.now(),
    order: 9999,
    summaries: [],
    pinned: true,
};

export type ActiveItem = {
    projectId: string | null;
    taskId: string | null;
}

export type HistoryEntry = {
    projects: Project[];
    activeItem: ActiveItem;
    selectedTaskIds: string[];
    label?: string;
    timestamp: number;
};

export const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const loadInitialData = (userId: string | null): { projects: Project[]; activeItem: ActiveItem; isLoaded: boolean; historyPast: HistoryEntry[]; historyFuture: HistoryEntry[] } => {
    const anonymousKey = 'projects_anonymous';
    const activeItemAnonymousKey = 'activeItem_anonymous';
    const historyAnonymousKey = 'history_anonymous';

    if (typeof window === 'undefined') {
        const initialItem = { projectId: null, taskId: null };
        return { projects: [initialUnassignedProject], activeItem: initialItem, isLoaded: false, historyPast: [], historyFuture: [] };
    }

    const projectKey = userId ? `projects_${userId}` : anonymousKey;
    const activeItemKey = userId ? `activeItem_${userId}` : activeItemAnonymousKey;
    const historyKey = userId ? `history_${userId}` : historyAnonymousKey;

    try {
        const storedProjectsJSON = window.localStorage.getItem(projectKey);
        const storedActiveItemJSON = window.localStorage.getItem(activeItemKey);
        const storedHistoryJSON = window.localStorage.getItem(historyKey);

        let projects: Project[] = storedProjectsJSON ? JSON.parse(storedProjectsJSON) : [];

        // Ensure unassigned folder exists and is unique
        const unassignedProjects = projects.filter(p => p.id === 'unassigned');
        const otherProjects = projects.filter(p => p.id !== 'unassigned');

        if (projects.length === 0) {
             projects = [initialUnassignedProject];
        } else if (unassignedProjects.length === 0) {
            projects = [initialUnassignedProject, ...otherProjects];
        } else if (unassignedProjects.length > 1) {
            const allUnassignedTasks = unassignedProjects.flatMap(p => p.tasks);
            const masterUnassigned = { ...initialUnassignedProject, tasks: allUnassignedTasks, lastEdited: Date.now() };
            projects = [masterUnassigned, ...otherProjects];
        } else {
            const currentUnassigned = unassignedProjects[0];
            projects = [{...currentUnassigned, name: 'Unassigned', order: 9999, pinned: true }, ...otherProjects];
        }

        const sanitizeCommentsRecursive = (comments?: Comment[]): Comment[] => {
            return (comments || []).map(c => ({
                id: c.id || crypto.randomUUID(),
                text: c.text || '',
                timestamp: c.timestamp || Date.now(),
                status: c.status || 'active',
                edited: c.edited || false,
                replies: c.replies ? sanitizeCommentsRecursive(c.replies) : [],
            }));
        };

        // Sanitize projects and scopes
        projects = projects.map((p, index) => {
            const sanitizeTasksRecursive = (tasks: Task[], parentId: string | null = null): Task[] => {
                return (tasks || []).map((t, taskIndex) => {
                    const newSubtasks = t.subtasks ? sanitizeTasksRecursive(t.subtasks, t.id) : [];
                    return {
                        id: t.id || crypto.randomUUID(),
                        text: t.text || '',
                        description: t.description || '',
                        completed: t.completed === undefined ? (t.status === 'done') : t.completed,
                        subtasks: newSubtasks,
                        order: t.order ?? taskIndex,
                        lastEdited: t.lastEdited ?? Date.now(),
                        status: t.status || (t.completed ? 'done' : 'todo'),
                        parentId: t.parentId === undefined ? parentId : t.parentId,
                        comments: sanitizeCommentsRecursive(t.comments),
                        executionResults: t.executionResults || [],
                        summaries: t.summaries || [],
                        source: t.source || 'manual'
                    };
                });
            }

            return {
                ...p,
                id: p.id || crypto.randomUUID(),
                name: p.name || 'Untitled Folder',
                description: p.description || '',
                order: p.id === 'unassigned' ? 9999 : (p.order ?? index),
                lastEdited: p.lastEdited ?? Date.now(),
                tasks: sanitizeTasksRecursive(p.tasks),
                summaries: p.summaries || [],
                pinned: p.id === 'unassigned' ? true : (p.pinned ?? false),
            };
        });

        const activeItem: ActiveItem = storedActiveItemJSON ? JSON.parse(storedActiveItemJSON) : { projectId: null, taskId: null };
        let historyPast: HistoryEntry[] = [];
        let historyFuture: HistoryEntry[] = [];
        if (storedHistoryJSON) {
            try {
                const parsed = JSON.parse(storedHistoryJSON);
                historyPast = Array.isArray(parsed?.past) ? parsed.past : [];
                historyFuture = Array.isArray(parsed?.future) ? parsed.future : [];
            } catch {}
        }

        // Validate activeItem
        let finalActiveItem = { ...activeItem };
        if (projects.length > 0 && !finalActiveItem.projectId) {
            finalActiveItem.projectId = projects.find(p => p.id !== 'unassigned')?.id || projects[0].id;
        }

        const activeProjectExists = projects.some(p => p.id === finalActiveItem.projectId);
        if (!activeProjectExists) {
            finalActiveItem = { projectId: projects.find(p => p.id !== 'unassigned')?.id || projects[0]?.id || null, taskId: null };
        } else if (finalActiveItem.taskId) {
            const activeProject = projects.find(p => p.id === finalActiveItem.projectId);
            const activeTaskPath = activeProject ? findTaskPath(activeProject.tasks, finalActiveItem.taskId) : [];
            if (activeTaskPath.length === 0) {
                finalActiveItem.taskId = null;
            }
        }

        return { projects, activeItem: finalActiveItem, isLoaded: true, historyPast, historyFuture };
    } catch (error) {
        console.warn('Failed to load folders from localStorage, starting fresh.', error);
        const keyToRemove = userId ? `projects_${userId}` : anonymousKey;
        const activeItemKeyToRemove = userId ? `activeItem_${userId}` : activeItemAnonymousKey;
        const historyKeyToRemove = userId ? `history_${userId}` : historyAnonymousKey;
        window.localStorage.removeItem(keyToRemove);
        window.localStorage.removeItem(activeItemKeyToRemove);
        window.localStorage.removeItem(historyKeyToRemove);
        return { projects: [initialUnassignedProject], activeItem: { projectId: null, taskId: null }, isLoaded: true, historyPast: [], historyFuture: [] };
    }
}

export const updateParentStatuses = (projects: Project[], childId: string | null): Project[] => {
    const taskMap = new Map<string, Task>();
    const parentMap = new Map<string, string | null>();

    const buildMaps = (tasks: Task[], parentId: string | null) => {
        for (const task of tasks) {
            taskMap.set(task.id, task);
            parentMap.set(task.id, parentId);
            if (task.subtasks) {
                buildMaps(task.subtasks, task.id);
            }
        }
    };
    
    projects.forEach(p => buildMaps(p.tasks, null));

    const idsToUpdate: Set<string | null> = new Set();
    if (childId) {
        let currentId: string | null = childId;
        while(currentId) {
            const parentId = parentMap.get(currentId);
            if (parentId) idsToUpdate.add(parentId);
            currentId = parentId || null;
        }
    } else {
        taskMap.forEach((_, key) => idsToUpdate.add(key));
    }

    idsToUpdate.forEach(id => {
        if (!id) return;
        const taskToUpdate = taskMap.get(id);
        if (taskToUpdate && taskToUpdate.subtasks && taskToUpdate.subtasks.length > 0) {
            const oldStatus = taskToUpdate.status;
            let newStatus: TaskStatus = 'todo';

            if (taskToUpdate.subtasks.every(s => s.status === 'done')) {
                newStatus = 'done';
            } else if (taskToUpdate.subtasks.some(s => s.status === 'inprogress' || s.status === 'done')) {
                newStatus = 'inprogress';
            }
            
            if (oldStatus !== newStatus) {
                taskToUpdate.status = newStatus;
                taskToUpdate.completed = newStatus === 'done';
                taskToUpdate.lastEdited = Date.now();
            }
        }
    });

    return projects;
};
