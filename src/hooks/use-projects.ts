

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, Task, TaskStatus, Comment, CommentStatus, Summary, ExecutionResult, Persona } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { findTaskPath, findTaskRecursive } from '@/lib/utils';
import { handleExecuteTask, handleRegenerateTask } from '@/app/actions';
import { useAuth } from './use-auth';


const initialUnassignedProject: Project = {
    id: 'unassigned',
    name: 'Unassigned',
    description: 'Scopes that have not been assigned to a specific folder.',
    tasks: [],
    lastEdited: Date.now(),
    order: 9999, // High order to keep it at the bottom
    summaries: [],
    pinned: true // Always pinned
};

type ActiveItem = {
    projectId: string | null;
    taskId: string | null;
}

function loadInitialData(userId: string | null): { projects: Project[]; activeItem: ActiveItem; isLoaded: boolean; } {
    const anonymousKey = 'projects_anonymous';
    const activeItemAnonymousKey = 'activeItem_anonymous';

    if (typeof window === 'undefined') {
        const initialItem = { projectId: null, taskId: null };
        return { projects: [initialUnassignedProject], activeItem: initialItem, isLoaded: false };
    }
    
    const projectKey = userId ? `projects_${userId}` : anonymousKey;
    const activeItemKey = userId ? `activeItem_${userId}` : activeItemAnonymousKey;

    try {
        const storedProjectsJSON = window.localStorage.getItem(projectKey);
        const storedActiveItemJSON = window.localStorage.getItem(activeItemKey);

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
            // Make sure the single unassigned folder has the correct static properties
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
                        source: t.source || 'manual' // Default existing scopes to 'manual'
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
                finalActiveItem.taskId = null; // Scope doesn't exist in folder, so unset it
            }
        }
        
        return { projects, activeItem: finalActiveItem, isLoaded: true };
    } catch (error) {
        console.warn('Failed to load folders from localStorage, starting fresh.', error);
        const keyToRemove = userId ? `projects_${userId}` : anonymousKey;
        const activeItemKeyToRemove = userId ? `activeItem_${userId}` : activeItemAnonymousKey;
        window.localStorage.removeItem(keyToRemove);
        window.localStorage.removeItem(activeItemKeyToRemove);
        return { projects: [initialUnassignedProject], activeItem: { projectId: null, taskId: null }, isLoaded: true };
    }
}


export function useProjects() {
    const { user, loading } = useAuth();
    const [state, setState] = useState<{ 
        projects: Project[]; 
        activeItem: ActiveItem; 
        selectedTaskIds: string[];
        isLoaded: boolean; 
    }>({ 
        projects: [initialUnassignedProject], 
        activeItem: { projectId: null, taskId: null },
        selectedTaskIds: [],
        isLoaded: false 
    });
    const [saveError, setSaveError] = useState<string | null>(null);
    const { toast } = useToast();
    const isInitialLoadForUser = useRef(true);


    useEffect(() => {
        if (!loading) {
            if (isInitialLoadForUser.current) {
                setState(prevState => ({ ...prevState, ...loadInitialData(user?.uid || null) }));
                isInitialLoadForUser.current = false;
            }
        }
    }, [user, loading]);
    
    // This effect handles switching data contexts when auth state changes
    useEffect(() => {
        if (!isInitialLoadForUser.current && !loading) {
             setState(prevState => ({ ...prevState, isLoaded: false })); // Set loading state
             // Give time for UI to show loading state before heavy load operation
             setTimeout(() => {
                setState(prevState => ({ ...prevState, ...loadInitialData(user?.uid || null) }));
             }, 50);
        }
    }, [user, loading]);

    // This effect handles saving data to localStorage
    useEffect(() => {
        if (state.isLoaded && !loading) {
            try {
                const projectKey = user ? `projects_${user.uid}` : 'projects_anonymous';
                const activeItemKey = user ? `activeItem_${user.uid}` : 'activeItem_anonymous';
                window.localStorage.setItem(projectKey, JSON.stringify(state.projects));
                window.localStorage.setItem(activeItemKey, JSON.stringify(state.activeItem));
                if (saveError) setSaveError(null);
            } catch (error) {
                console.warn(`Error writing to localStorage:`, error);
                setSaveError('Your browser may be out of storage space. Changes are not being saved.');
            }
        }
    }, [state.projects, state.activeItem, state.isLoaded, user, loading, saveError]);

    // This effect shows a toast only when a save error occurs
    useEffect(() => {
        if (saveError) {
            toast({ title: 'Could not save changes', description: saveError, variant: 'destructive'});
        }
    }, [saveError, toast]);

    const setActiveItem = useCallback((item: ActiveItem) => {
        setState(prevState => ({ ...prevState, activeItem: item, selectedTaskIds: [] })); // Clear selection on navigation
    }, []);

    const setSelectedTaskIds = useCallback((ids: string[]) => {
        setState(prevState => ({ ...prevState, selectedTaskIds: ids }));
    }, []);

    const createProject = (name: string): string | null => {
        const newProject: Project = {
            id: crypto.randomUUID(),
            name,
            tasks: [],
            description: '',
            order: state.projects.filter(p => p.id !== 'unassigned').length,
            lastEdited: Date.now(),
            summaries: [],
            pinned: false,
        }
        setState(prevState => ({
            ...prevState, 
            projects: [...prevState.projects, newProject]
        }));
        return newProject.id;
    };
    
    const createTaskInProject = (projectId: string, taskName: string): string | null => {
        const newTaskId = crypto.randomUUID();
        let success = false;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            const highestOrder = Math.max(-1, ...project.tasks.map((t:Task) => t.order));
            const newTask: Task = {
                id: newTaskId,
                text: taskName,
                status: 'todo',
                completed: false,
                subtasks: [],
                order: highestOrder + 1,
                lastEdited: Date.now(),
                parentId: null,
                comments: [],
                executionResults: [],
                summaries: [],
                source: 'manual'
            };
            project.tasks.push(newTask);
            project.lastEdited = Date.now();
            success = true;
            return { ...prevState, projects: projectsCopy };
        });
        return success ? newTaskId : null;
    };


    const updateProject = (updatedProject: Project) => {
        setState(prevState => {
            const newState = {
                ...prevState,
                projects: prevState.projects.map(p => p.id === updatedProject.id ? { ...updatedProject, lastEdited: Date.now() } : p)
            }
            return newState;
        });
    };

    const setTasksForProject = (projectId: string, tasks: Task[]) => {
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (project) {
                project.tasks = tasks;
                project.lastEdited = Date.now();
            }
            return { ...prevState, projects: projectsCopy };
        });
    };

    const addSummaryToProject = (projectId: string, summaryText: string) => {
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            const newSummary: Summary = {
                text: summaryText,
                timestamp: Date.now()
            };

            // Prepend the new summary to the beginning of the array
            project.summaries = [newSummary, ...(project.summaries || [])];
            
            return { ...prevState, projects: projectsCopy };
        });
    };

    const addSummaryToTask = (projectId: string, taskId: string, summaryText: string) => {
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            const task = findTaskRecursive(project.tasks, taskId);
            if (task) {
                 const newSummary: Summary = {
                    text: summaryText,
                    timestamp: Date.now()
                };
                task.summaries = [newSummary, ...(task.summaries || [])];
                task.lastEdited = Date.now();
            }
            
            return { ...prevState, projects: projectsCopy };
        });
    };

    const deleteProject = (projectId: string): boolean => {
        if (projectId === 'unassigned') {
            toast({ title: 'Error', description: 'Cannot delete the Unassigned folder.', variant: 'destructive' });
            return false;
        }
        
        let wasDeleted = false;
        setState(prevState => {
            const updatedProjects = prevState.projects.filter((p: Project) => p.id !== projectId);
            
            if (updatedProjects.length < prevState.projects.length) {
                wasDeleted = true;
                let newActiveItem = prevState.activeItem;
                if (prevState.activeItem.projectId === projectId) {
                    newActiveItem = { projectId: updatedProjects.find(p => p.id !== 'unassigned')?.id || 'unassigned', taskId: null };
                }
                return {
                    ...prevState,
                    projects: updatedProjects,
                    activeItem: newActiveItem,
                };
            }
            return prevState;
        });
        return wasDeleted;
    };
    
    const deleteTask = (projectId: string, taskId: string): boolean => {
         let wasDeleted = false;
         setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;
    
            const deleteTaskInTree = (tasks: Task[]): { remainingTasks: Task[], wasDeleted: boolean } => {
                let deletedInThisLevel = false;
                const remainingTasks = tasks.filter((task: Task) => {
                    if (task.id === taskId) {
                        deletedInThisLevel = true;
                        return false;
                    }
                    if (task.subtasks && task.subtasks.length > 0) {
                        const result = deleteTaskInTree(task.subtasks);
                        task.subtasks = result.remainingTasks;
                        if (result.wasDeleted) deletedInThisLevel = true;
                    }
                    return true;
                });
                return { remainingTasks, wasDeleted: deletedInThisLevel };
            };
    
            const { remainingTasks, wasDeleted: deleted } = deleteTaskInTree(project.tasks);
            wasDeleted = deleted;

            if (wasDeleted) {
                project.tasks = remainingTasks;
                project.lastEdited = Date.now();
                
                let newActiveItem = prevState.activeItem;
                if (prevState.activeItem.taskId === taskId) {
                    newActiveItem = { ...prevState.activeItem, taskId: null };
                }
                
                const finalProjects = updateParentStatuses(projectsCopy, null);
    
                return {
                    ...prevState,
                    projects: finalProjects,
                    activeItem: newActiveItem,
                    selectedTaskIds: prevState.selectedTaskIds.filter(id => id !== taskId),
                };
            }
            return prevState;
        });
        return wasDeleted;
    };
    
    const deleteSelectedTasks = (projectId: string, taskIds: string[]): boolean => {
        let deletedCount = 0;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            const idSet = new Set(taskIds);

            const filterTasksRecursive = (tasks: Task[]): Task[] => {
                const remainingTasks = [];
                for (const task of tasks) {
                    if (idSet.has(task.id)) {
                        deletedCount++;
                        continue; // Skip this task
                    }
                    if (task.subtasks) {
                        task.subtasks = filterTasksRecursive(task.subtasks);
                    }
                    remainingTasks.push(task);
                }
                return remainingTasks;
            };

            project.tasks = filterTasksRecursive(project.tasks);
            project.lastEdited = Date.now();

            if (deletedCount > 0) {
                const finalProjects = updateParentStatuses(projectsCopy, null);
                return {
                    ...prevState,
                    projects: finalProjects,
                    selectedTaskIds: [],
                };
            }

            return prevState;
        });
        return deletedCount > 0;
    };


    const moveTaskToProject = (taskId: string, sourceProjectId: string, targetProjectId: string): boolean => {
        if (sourceProjectId === targetProjectId) return false;
        
        let moved = false;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const sourceProject = projectsCopy.find((p: Project) => p.id === sourceProjectId);
            const targetProject = projectsCopy.find((p: Project) => p.id === targetProjectId);
            if (!sourceProject || !targetProject) return prevState;
    
            let taskToMove: Task | null = null;
            
            const removeTaskRecursive = (tasks: Task[]): Task[] => {
              return tasks.filter((t) => {
                if (t.id === taskId) {
                  taskToMove = t;
                  return false;
                }
                if (t.subtasks) {
                  t.subtasks = removeTaskRecursive(t.subtasks);
                }
                return true;
              });
            };
            
            sourceProject.tasks = removeTaskRecursive(sourceProject.tasks);
            
            if (taskToMove) {
                const task = taskToMove as Task;
                const highestOrder = Math.max(-1, ...targetProject.tasks.map((t: Task) => t.order ?? 0));
                const movedTaskWithNewOrder: Task = {
                    ...task,
                    order: highestOrder + 1,
                    lastEdited: Date.now(),
                    parentId: null
                };
                targetProject.tasks.push(movedTaskWithNewOrder);
    
                sourceProject.lastEdited = Date.now();
                targetProject.lastEdited = Date.now();
                moved = true;
                
                let newActiveItem = prevState.activeItem;
                if (prevState.activeItem.taskId === taskId) {
                    newActiveItem = { projectId: targetProjectId, taskId: taskId };
                }
                
                return { ...prevState, projects: projectsCopy, activeItem: newActiveItem };
            }
            return prevState;
        });
        return moved;
    };
    
    const promoteSubtaskToTask = (projectId: string, subtaskId: string): boolean => {
        let promoted = false;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p:Project) => p.id === projectId);
            if (!project) return prevState;

            let subtaskToPromote: Task | null = null;
            let parentIdOfPromoted: string | null = null;

            const findAndRemoveSubtask = (tasks: Task[]): Task[] => {
                return tasks.map(task => {
                    if (task.subtasks && task.subtasks.length > 0) {
                        const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskId);
                        if (subtaskIndex > -1) {
                            subtaskToPromote = { ...task.subtasks[subtaskIndex], parentId: null, lastEdited: Date.now() };
                            task.subtasks.splice(subtaskIndex, 1);
                            parentIdOfPromoted = task.id;
                        } else {
                            task.subtasks = findAndRemoveSubtask(task.subtasks);
                        }
                    }
                    return task;
                });
            };
            
            project.tasks = findAndRemoveSubtask(project.tasks);

            if (subtaskToPromote) {
                const task = subtaskToPromote as Task;
                const highestOrder = Math.max(-1, ...project.tasks.map((t:Task) => t.order ?? 0));
                task.order = highestOrder + 1;
                project.tasks.push(subtaskToPromote);
                project.lastEdited = Date.now();
                promoted = true;
                
                const finalProjects = updateParentStatuses(projectsCopy, parentIdOfPromoted);
                return { ...prevState, projects: finalProjects };
            }
            
            return prevState;
        });
        return promoted;
    }

    const addSubtask = (projectId: string, anchorTaskId: string, newSubtasks: Task[], isSibling: boolean): boolean => {
        let taskAdded = false;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;
    
            const addOrUpdateTaskRecursive = (tasks: Task[]): Task[] => {
              for (let i = 0; i < tasks.length; i++) {
                if (tasks[i].id === anchorTaskId) {
                  taskAdded = true;
                  const task = tasks[i];
                  const highestOrder = Math.max(-1, ...(task.subtasks || []).map(t => t.order ?? 0));
                  const processedNewSubtasks = newSubtasks.map((sub, idx) => ({
                    ...sub,
                    parentId: task.id,
                    order: highestOrder + 1 + idx,
                  }));
                  task.subtasks = [...(task.subtasks || []), ...processedNewSubtasks];
                  task.lastEdited = Date.now();
                  return tasks;
                }
                if (tasks[i].subtasks && tasks[i].subtasks.length > 0) {
                   tasks[i].subtasks = addOrUpdateTaskRecursive(tasks[i].subtasks);
                }
              }
              return tasks;
            };
    
            project.tasks = addOrUpdateTaskRecursive(project.tasks);
    
            if (taskAdded) {
                project.lastEdited = Date.now();
                const finalProjects = updateParentStatuses(projectsCopy, anchorTaskId);
                return { ...prevState, projects: finalProjects };
            }
    
            return prevState;
        });
        return taskAdded;
    };

    const updateTaskAndPropagateStatus = (projectId: string, updatedTask: Task) => {
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            // Update the specific scope
            let taskFound = false;
            const updateTaskInTree = (tasks: Task[]): Task[] => {
                return tasks.map(t => {
                    if (t.id === updatedTask.id) {
                        taskFound = true;
                        // Keep sub-scopes, comments, etc. from original object `t` but merge everything else
                        return { 
                            ...t, 
                            ...updatedTask,
                            lastEdited: Date.now() 
                        };
                    }
                    if (t.subtasks && t.subtasks.length > 0) {
                        return { ...t, subtasks: updateTaskInTree(t.subtasks) };
                    }
                    return t;
                });
            };

            project.tasks = updateTaskInTree(project.tasks);

            if (taskFound) {
                const finalProjects = updateParentStatuses(projectsCopy, updatedTask.id);
                return { ...prevState, projects: finalProjects };
            }

            return prevState;
        });
    };
    
    // Helper function to recursively update parent statuses
    const updateParentStatuses = (projects: Project[], childId: string | null): Project[] => {
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
        } else { // If childId is null, we need to check all parents
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
    
    const findAndPerformCommentAction = (
        projectId: string, 
        taskId: string, 
        action: (comments: Comment[]) => { found: boolean, updatedComments: Comment[] }
    ): boolean => {
        let actionResult = false;
        setState(prevState => {
            const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
            const project = projectsCopy.find((p: Project) => p.id === projectId);
            if (!project) return prevState;

            const task = findTaskRecursive(project.tasks, taskId);
            if (task) {
                const { found, updatedComments } = action(task.comments || []);
                if (found) {
                    task.comments = updatedComments;
                    task.lastEdited = Date.now();
                    actionResult = true;
                    return { ...prevState, projects: projectsCopy };
                }
            }
            actionResult = false;
            return prevState;
        });
        return actionResult;
    };

    const addCommentToTask = (projectId: string, taskId: string, commentText: string): boolean => {
        const action = (comments: Comment[]) => {
            const newComment: Comment = {
                id: crypto.randomUUID(),
                text: commentText,
                timestamp: Date.now(),
                status: 'active',
                edited: false,
                replies: []
            };
            return { found: true, updatedComments: [...comments, newComment] };
        };
        return findAndPerformCommentAction(projectId, taskId, action);
    };
    
    const addReplyToComment = (projectId: string, taskId: string, parentCommentId: string, replyText: string): boolean => {
        const action = (comments: Comment[]) => {
            let found = false;
            const newReply: Comment = {
                id: crypto.randomUUID(),
                text: replyText,
                timestamp: Date.now(),
                status: 'active',
                edited: false,
                replies: []
            };

            const addReplyRecursive = (commentList: Comment[]): Comment[] => {
                return commentList.map(c => {
                    if (c.id === parentCommentId) {
                        found = true;
                        c.replies = [...c.replies, newReply];
                    } else if (c.replies.length > 0) {
                        c.replies = addReplyRecursive(c.replies);
                    }
                    return c;
                });
            };
            const updatedComments = addReplyRecursive(comments);
            return { found, updatedComments };
        };
        return findAndPerformCommentAction(projectId, taskId, action);
    };

    const updateComment = (projectId: string, taskId: string, commentId: string, newText?: string, newStatus?: CommentStatus): boolean => {
        const action = (comments: Comment[]) => {
            let found = false;
            const updateRecursive = (commentList: Comment[]): Comment[] => {
                return commentList.map(c => {
                    if (c.id === commentId) {
                        found = true;
                        if (newText !== undefined) {
                            c.text = newText;
                            c.edited = true;
                        }
                        if (newStatus !== undefined) c.status = newStatus;
                        c.timestamp = Date.now();
                    } else if (c.replies.length > 0) {
                        c.replies = updateRecursive(c.replies);
                    }
                    return c;
                });
            };
            const updatedComments = updateRecursive(comments);
            return { found, updatedComments };
        };
        return findAndPerformCommentAction(projectId, taskId, action);
    };
    
    const deleteComment = (projectId: string, taskId: string, commentId: string): boolean => {
         const action = (comments: Comment[]) => {
            let found = false;
            const deleteRecursive = (commentList: Comment[]): Comment[] => {
                const filtered = commentList.filter(c => c.id !== commentId);
                if (filtered.length < commentList.length) {
                    found = true;
                    return filtered.map(c => ({...c, replies: c.replies.length > 0 ? deleteRecursive(c.replies) : [] }));
                }
                return commentList.map(c => ({...c, replies: c.replies.length > 0 ? deleteRecursive(c.replies) : [] }));
            };
            const updatedComments = deleteRecursive(comments);
            return { found, updatedComments };
        };
        return findAndPerformCommentAction(projectId, taskId, action);
    };

    const executeTask = async (projectId: string, taskId: string, taskText: string, userInput?: string, projectName?: string, otherTasks?: string[]): Promise<boolean> => {
        toast({ title: 'AI is on it!', description: `Executing scope: "${taskText}"` });
        
        const result = await handleExecuteTask({ 
            task: taskText, 
            userInput, 
            projectName, 
            otherTasks 
        });

        if (result.success && result.result) {
            setState(prevState => {
                const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
                const proj = projectsCopy.find((p: Project) => p.id === projectId);
                if (!proj) return prevState;
                const task = findTaskRecursive(proj.tasks, taskId);
                if (task) {
                    const newResult: ExecutionResult = {
                        timestamp: Date.now(),
                        resultText: result.result
                    };
                    if (!task.executionResults) {
                        task.executionResults = [];
                    }
                    task.executionResults.unshift(newResult);
                    task.lastEdited = Date.now();
                }
                return { ...prevState, projects: projectsCopy };
            });
            return true;
        } else {
            toast({ title: 'Execution Failed', description: result.error, variant: 'destructive' });
            return false;
        }
    };
    
    const regenerateTask = async (projectId: string, taskId: string, originalTask: string, userInput?: string, persona?: Persona | null) => {
        toast({ title: 'AI is regenerating the scope...' });
        const result = await handleRegenerateTask({ originalTask, userInput, persona });
        if (result.success && result.newTask) {
            setState(prevState => {
                const projectsCopy = JSON.parse(JSON.stringify(prevState.projects));
                const project = projectsCopy.find((p: Project) => p.id === projectId);
                if (!project) return prevState;
                const task = findTaskRecursive(project.tasks, taskId);
                if (task) {
                    task.text = result.newTask;
                    task.lastEdited = Date.now();
                }
                return { ...prevState, projects: projectsCopy };
            });
            toast({ title: 'Scope regenerated!', variant: 'default' });
        } else {
            toast({ title: 'Regeneration Failed', description: result.error, variant: 'destructive' });
        }
    };


    return {
        projects: state.projects,
        activeProjectId: state.activeItem.projectId,
        activeTaskId: state.activeItem.taskId,
        selectedTaskIds: state.selectedTaskIds,
        isLoaded: state.isLoaded,
        setActiveItem,
        setSelectedTaskIds,
        createProject,
        createTaskInProject,
        updateProject,
        setTasksForProject,
        addSummaryToProject,
        addSummaryToTask,
        updateTaskAndPropagateStatus,
        deleteProject,
        deleteTask,
        deleteSelectedTasks,
        moveTaskToProject,
        promoteSubtaskToTask,
        addSubtask,
        addCommentToTask,
        addReplyToComment,
        updateComment,
        deleteComment,
        executeTask,
        regenerateTask
    };
}

    
