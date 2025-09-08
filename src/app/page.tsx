
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Task, SortOption, Project } from '@/lib/types';
// Persona feature removed
import { handleGenerateTasks, handleGenerateProjectSummary, handleRephraseGoal, handleGenerateAlternativeScope, handleProposeChanges } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, LayoutPanelLeft, ListTree, KanbanSquare, ArrowUpDown as _ArrowUpDown, Pencil, ChevronRight, MessageSquare, BrainCircuit, Save, Edit, Waypoints, FileText, Zap, Trash2, FilePlus2, Settings, Menu, HelpCircle, Folder, File, Zap as ZapIcon, Bot, List, Map as MapIcon, Columns, LogOut, User, ImagePlus, RotateCw, RotateCcw, History } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TreeViewWrapper as TreeView } from '@/components/tree-view';
import { KanbanView } from '@/components/kanban-view';
import { CommentsView } from '@/components/comments-view';
import { MindMapView } from '@/components/mind-map-view';
import { SummaryView } from '@/components/summary-view';
import { ExecutionView } from '@/components/execution-view';
import { AuthDialog } from '@/components/auth-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useProjects } from '@/hooks/use-projects';
import { findTaskPath, countCommentsRecursively, sortProjects, scanDependencies } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { GenerateTaskStepsOutput } from '@/ai/flows/generate-task-steps';
// import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
// import Linkify from 'linkify-react';
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
// import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
// Persona feature removed

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};


// Pretty-print JSON for human-readable preview
const prettyPrintJson = (data: any): string => {
    if (data == null) return '';
    if (typeof data === 'string') return data.trim();
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
};

// Convert arbitrary raw JSON into Task[] (preserve keys exactly; no humanization)
const convertRawToTasks = (raw: any, parentId: string | null): Task[] => {
    const unwrapSingleRoot = (v: any) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const keys = Object.keys(v);
            if (keys.length === 1) return (v as any)[keys[0]];
        }
        return v;
    };

    const makeTask = (text: string, index: number, currentParentId: string | null, description = '', children: Task[] = []): Task => ({
        id: crypto.randomUUID(),
        text,
        description,
        completed: false,
        status: 'todo',
        subtasks: children,
        lastEdited: Date.now(),
        order: index,
        parentId: currentParentId,
        comments: [],
        executionResults: [],
        summaries: [],
        source: 'ai',
    });

    const fromAny = (value: any, currentParentId: string | null): Task[] => {
        if (value == null) return [];
        if (Array.isArray(value)) {
            return value.flatMap((v, _i) => fromAny(v, currentParentId));
        }
        if (typeof value === 'object') {
            // Generic object: each key becomes a task with nested conversion of its value
        return Object.entries(value).map(([k, val], idx) => {
                if (
                    typeof val === 'string' ||
                    typeof val === 'number' ||
                    typeof val === 'boolean'
                ) {
            // Primitive: render inline in text e.g., "Timing: Serve 15-20 minutes before main"
            const inline = `${String(k)}: ${String(val)}`;
            return makeTask(inline, idx, currentParentId, '', []);
                }
                // Non-primitive: children derived recursively
                const children = fromAny(val, null);
                return makeTask(String(k), idx, currentParentId, '', children);
            });
        }
        // Primitive
        return [makeTask(String(value), 0, currentParentId)];
    };

    // Assign order indices at the top level
    const top = fromAny(unwrapSingleRoot(raw), parentId);
    return top.map((t, i) => ({ ...t, order: i, parentId }));
};


export default function Home() {
    const { user, loading: authLoading, logOut } = useAuth();

  const { toast } = useToast();
    const { 
    projects, 
    activeProjectId,
    activeTaskId,
    selectedTaskIds,
    setSelectedTaskIds,
    setActiveItem,
    createProject,
    createTaskInProject,
    updateProject,
    _setTasksForProject,
    addSummaryToProject,
    addSummaryToTask,
    updateTaskAndPropagateStatus,
    moveTaskToProject,
    deleteProject,
    deleteTask,
    deleteSelectedTasks,
    promoteSubtaskToTask,
    addSubtask,
    addCommentToTask,
    addReplyToComment,
    updateComment,
    deleteComment,
    executeTask,
    isLoaded,
    undo,
    redo,
    canUndo,
        canRedo,
        historyPast,
        historyFuture
  } = useProjects();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [goal, setGoal] = useState('');
  const [goalImage, setGoalImage] = useState<{file: File, dataUri: string} | null>(null);
  const [taskSortOption, setTaskSortOption] = useState<SortOption>({ key: 'edit-date', direction: 'desc' });
  const [projectSortOption, setProjectSortOption] = useState<SortOption>({ key: 'edit-date', direction: 'desc' });
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [commentingTask, setCommentingTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [executingTask, setExecutingTask] = useState<Task | null>(null);
  const [executionInput, setExecutionInput] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [recentlyChanged, setRecentlyChanged] = useState<Record<string, { kind: 'new' | 'updated'; at: number }>>({});
  
    const [aiConfirmationResponse, setAiConfirmationResponse] = useState<GenerateTaskStepsOutput | null>(null);
    // Alternative flow response + summary dialog
    const [altChangesSummary, setAltChangesSummary] = useState<{ replacedTitle: string; updatedTargets: string[]; notes?: string[] } | null>(null);
    const [isAltSummaryDialogOpen, setIsAltSummaryDialogOpen] = useState(false);
    const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
    const [refinedGoal, setRefinedGoal] = useState<string | null>(null);
            const [proposal, setProposal] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [confirmationImage, setConfirmationImage] = useState<{file: File, dataUri: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
    // Persona feature removed
    const isRefineMode = useMemo(() => Boolean(confirmationInput.trim() || confirmationImage), [confirmationInput, confirmationImage]);
    // Unified confirmation dialog mode
        const [confirmationMode, setConfirmationMode] = useState<{ type: 'initial' | 'subscope' | 'regenerate' | 'alternative'; targetTaskId?: string }>({ type: 'initial' });

    // Keyboard shortcuts: Undo/Redo
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const mod = isMac ? e.metaKey : e.ctrlKey;
            if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            } else if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                if (canRedo) redo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo, redo, canUndo, canRedo]);

  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<{file: File, dataUri: string} | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUri = await readFileAsDataURL(file);
        setter({ file, dataUri });
                    } catch {
                        toast({ variant: 'destructive', title: 'Error reading file', description: 'Could not process the selected file.' });
                    }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 240 && newWidth < 600) { // Min and max width
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const sortedProjects = useMemo(() => {
    return sortProjects(projects, projectSortOption);
  }, [projects, projectSortOption]);
  
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return sortedProjects.find(p => p.id === activeProjectId) || null;
  }, [sortedProjects, activeProjectId]);

  const activeTask = useMemo(() => {
    if (!activeProject || !activeTaskId) return null;
    const path = findTaskPath(activeProject.tasks, activeTaskId, { sort: true, sortOption: taskSortOption });
    return path ? path[path.length - 1] : null;
  }, [activeProject, activeTaskId, taskSortOption]);
  
  const breadcrumbPath = useMemo(() => {
    if (!activeProject || !activeTaskId) return [];
    return findTaskPath(activeProject.tasks, activeTaskId, { sort: true, sortOption: taskSortOption });
  }, [activeProject, activeTaskId, taskSortOption]);

  const totalCommentCount = useMemo(() => {
    if (!activeProject) return 0;
    return countCommentsRecursively(activeProject.tasks);
  }, [activeProject]);

  useEffect(() => {
    if (activeProject) {
        setDescriptionText(activeProject.description || '');
    } else {
        setDescriptionText('');
    }
    setAiConfirmationResponse(null);
    setIsEditingDescription(false);
  }, [activeProject]);

  const onFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!goal.trim() || !isLoaded || !activeProject) return;

    const targetProjectId = activeProjectId || 'unassigned';
    const targetProject = projects.find(p => p.id === targetProjectId);

    if (!targetProject) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find a folder to add the scope to.' });
        return;
    }

    setIsGenerating(true);

    try {
        toast({ title: 'Clarifying scope...', description: 'AI is rephrasing for clarity.' });
        const isUnassigned = targetProject.id === 'unassigned';
        const result = await handleRephraseGoal({
            goal,
            projectName: isUnassigned ? undefined : targetProject.name,
            existingTasks: isUnassigned ? [] : targetProject.tasks.map(t => t.text),
            photoDataUri: goalImage?.dataUri,
        });
        if (!result.success || !result.data) {
            toast({ variant: 'destructive', title: 'Rephrase Failed', description: result.error || 'The AI could not rephrase the scope.' });
            return;
        }
    setRefinedGoal(result.data.goal);
    setAiConfirmationResponse({ raw: result.data.goal });
    setIsConfirmationDialogOpen(true);
    setConfirmationMode({ type: 'initial' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during generation.';
        toast({ variant: 'destructive', title: 'An unexpected error occurred', description: errorMessage });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAcceptConfirmation = async () => {
    if (!isLoaded) return;
  
    const targetProjectId = activeProjectId || 'unassigned';
    const targetProject = projects.find(p => p.id === targetProjectId);

    if (!targetProject) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find a folder to add the scope to.' });
        return;
    }
  
    setIsGenerating(true);
    // Keep dialog open during some flows to allow follow-ups; we will close it explicitly per-branch
  
    try {
            const isUnassigned = targetProject.id === 'unassigned';

            // If user provided feedback, refine the goal only (do not generate tasks yet)
            const hasNewInput = confirmationInput.trim() || confirmationImage;
            if (hasNewInput) {
                toast({ title: 'Refining scope...' });
                const res = await handleRephraseGoal({
                    goal: refinedGoal || goal,
                    userInput: confirmationInput.trim() || undefined,
                    projectName: isUnassigned ? undefined : targetProject.name,
                    existingTasks: isUnassigned ? [] : targetProject.tasks.map(t => t.text),
                    photoDataUri: confirmationImage?.dataUri || goalImage?.dataUri,
                });
                if (!res.success || !res.data) {
                    toast({ variant: 'destructive', title: 'Refine Failed', description: res.error || 'The AI could not refine the scope.' });
                    setIsGenerating(false);
                    return;
                }
                const newGoal = res.data.goal;
                setRefinedGoal(newGoal);
                setAiConfirmationResponse({ raw: newGoal });
                setConfirmationInput('');
                setConfirmationImage(null);
                                setIsConfirmationDialogOpen(true); // stay open
                                // Refresh proposal preview for non-initial modes
                                if (confirmationMode.type !== 'initial' && confirmationMode.targetTaskId) {
                                    setProposal('');
                                    const parentPathTitles = findTaskPath(targetProject.tasks, confirmationMode.targetTaskId).map(t => t.text).slice(0, -1);
                                    const taskPath = findTaskPath(targetProject.tasks, confirmationMode.targetTaskId);
                                    const node = taskPath.at(-1);
                                    const siblings = node ? ((node.parentId ? findTaskPath(targetProject.tasks, node.parentId).at(-1)?.subtasks || [] : targetProject.tasks).filter(t => t.id !== node.id).map(t => t.text)) : [];
                                    const existingChildren = node ? (node.subtasks || []).map(t => t.text) : [];
                                    const res2 = await handleProposeChanges({
                                        mode: confirmationMode.type === 'regenerate' ? 'regenerate' : confirmationMode.type === 'subscope' ? 'subscope' : 'alternative',
                                        targetText: newGoal,
                                        projectName: targetProject.name,
                                        parentPathTitles,
                                        siblingTitles: siblings,
                                        existingChildren,
                                        userInput: '',
                                    });
                                    if (res2.success && res2.data) setProposal(res2.data); else setProposal(null);
                                }
                setIsGenerating(false);
                return; // Stop here; user can iterate further
            }

            // No feedback: now generate based on mode
            if (confirmationMode.type === 'initial') {
                const finalGoal = refinedGoal || goal;
                toast({ title: 'Generating scopes...' });
                const gen = await handleGenerateTasks({
                    goal: finalGoal,
                    projectName: isUnassigned ? undefined : targetProject.name,
                    existingTasks: isUnassigned ? [] : targetProject.tasks.map(t => t.text),
                    photoDataUri: goalImage?.dataUri,
                });
                if (!gen.success || !gen.data) {
                    toast({ variant: 'destructive', title: 'AI Generation Failed', description: gen.error || 'The AI did not return a valid structure.' });
                    setIsGenerating(false);
                    return;
                }
                const generatedTasks = convertRawToTasks(gen.data.raw, null);
                if (generatedTasks.length === 0) {
                    toast({ variant: 'destructive', title: 'AI Generation Failed', description: 'The AI returned an empty or invalid structure.' });
                    setIsGenerating(false);
                    return;
                }
                const highestOrder = Math.max(-1, ...targetProject.tasks.map(t => t.order));
                const newParentTask: Task = {
                    id: crypto.randomUUID(),
                    text: finalGoal,
                    description: '',
                    completed: false,
                    status: 'todo',
                    subtasks: generatedTasks,
                    lastEdited: Date.now(),
                    order: highestOrder + 1,
                    parentId: null,
                    comments: [],
                    executionResults: [],
                    summaries: [],
                    source: 'ai'
                };
                generatedTasks.forEach(task => task.parentId = newParentTask.id);
                updateProject({ ...targetProject, tasks: [...targetProject.tasks, newParentTask] });
                toast({ title: `Scopes generated for "${finalGoal}"` });
                setActiveItem({ projectId: targetProjectId, taskId: newParentTask.id });
                setActiveTab('list');
                setIsConfirmationDialogOpen(false);
            } else if (confirmationMode.type === 'alternative') {
                const parentId = confirmationMode.targetTaskId;
                const path = parentId ? findTaskPath(targetProject.tasks, parentId) : null;
                const parentTask = path && path.length ? path[path.length - 1] : null;
                if (!parentTask) {
                    toast({ variant: 'destructive', title: 'Scope not found', description: 'Could not locate the target scope.' });
                    setIsGenerating(false);
                    return;
                }
                // Build dependency candidates via lightweight scan
                const depCandidates = scanDependencies(targetProject.tasks, parentTask.text);
                const parentBreadcrumb = findTaskPath(targetProject.tasks, parentTask.id).map(t => t.text).slice(0, -1);
                const siblingTitles = (() => {
                    if (!parentTask.parentId) return targetProject.tasks.filter(t => t.id !== parentTask.id).map(t => t.text);
                    const parentPath = findTaskPath(targetProject.tasks, parentTask.parentId);
                    const maybeParent = parentPath.length ? parentPath[parentPath.length - 1] : null;
                    return (maybeParent?.subtasks || []).filter(t => t.id !== parentTask.id).map(t => t.text);
                })();

                // Minimal project JSON for context
                type MinimalNode = { id: string; text: string; description?: string; children: MinimalNode[] };
                const toMinimal = (tasks: Task[]): MinimalNode[] => tasks.map(t => ({ id: t.id, text: t.text, description: t.description, children: t.subtasks ? toMinimal(t.subtasks) : [] }));
                const minimalProject = { name: targetProject.name, tasks: toMinimal(targetProject.tasks) };

                toast({ title: 'Creating alternative and assessing related updates...' });
                const alt = await handleGenerateAlternativeScope({
                    selectedNode: { id: parentTask.id, text: parentTask.text, description: parentTask.description, subtasks: parentTask.subtasks?.map(st => ({ text: st.text, description: st.description, subtasks: st.subtasks?.length ? [{}] : undefined })) },
                    parentPathTitles: parentBreadcrumb,
                    siblingTitles,
                    inferredType: 'Scope',
                    dependencyCandidates: depCandidates,
                    projectName: targetProject.name,
                    // Always include minimal full JSON so the AI can detect true references across the tree
                    fullProjectJson: minimalProject,
                    trimmedContext: undefined,
                });

                if (!alt.success || !alt.data) {
                    toast({ variant: 'destructive', title: 'AI Failed', description: alt.error || 'Could not create an alternative.' });
                    setIsGenerating(false);
                    return;
                }

                const altData = alt.data;
                // Helper to parse a one-root outline into a node replacement (preserve id, parent, order)
                const parseOutlineToNode = (outline: any, existing: Task): Task => {
                    const keys = outline && typeof outline === 'object' && !Array.isArray(outline) ? Object.keys(outline) : [];
                    if (keys.length !== 1) {
                        // Fallback: if invalid, just update title text distinctly
                        return { ...existing, text: typeof outline === 'string' ? outline : existing.text + ' (Alternative)', lastEdited: Date.now(), source: 'ai' };
                    }
                    const rootTitle = keys[0];
                    const rootVal = outline[rootTitle];
                    const makeChildren = (val: any): Task[] => {
                        if (!val) return [];
                        if (Array.isArray(val)) {
                            return val.flatMap(v => makeChildren(v));
                        }
                        if (typeof val === 'object') {
                            return Object.entries(val).map(([k, v], idx) => ({
                                id: crypto.randomUUID(),
                                text: String(k),
                                description: '',
                                completed: false,
                                status: 'todo',
                                subtasks: makeChildren(v),
                                lastEdited: Date.now(),
                                order: idx,
                                parentId: existing.id,
                                comments: [],
                                executionResults: [],
                                summaries: [],
                                source: 'ai'
                            }));
                        }
                        return [{
                            id: crypto.randomUUID(),
                            text: String(val),
                            description: '',
                            completed: false,
                            status: 'todo',
                            subtasks: [],
                            lastEdited: Date.now(),
                            order: 0,
                            parentId: existing.id,
                            comments: [],
                            executionResults: [],
                            summaries: [],
                            source: 'ai'
                        }];
                    };
                    const newChildren = makeChildren(rootVal);
                    // Preserve existing id and parent/order; replace text and children
                    return {
                        ...existing,
                        text: String(rootTitle),
                        description: existing.description || '',
                        subtasks: newChildren,
                        lastEdited: Date.now(),
                        source: 'ai'
                    };
                };

                // Apply replacement and patches - DEEP COPY to ensure mutations work
                const draftTasks = JSON.parse(JSON.stringify(targetProject.tasks));
                const pathForUpdate = findTaskPath(draftTasks, parentTask.id);
                if (!pathForUpdate.length) {
                    toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not locate the target during apply.' });
                    setIsGenerating(false);
                    return;
                }
                const targetNode = pathForUpdate[pathForUpdate.length - 1];
                const newOutline = (altData as any)["New Task Outline"] ?? (altData as any).NewTaskOutline;
                const replaced = parseOutlineToNode(newOutline, targetNode);
                // Replace fields on the existing target node
                targetNode.text = replaced.text;
                targetNode.description = replaced.description;
                targetNode.subtasks = replaced.subtasks;
                targetNode.lastEdited = Date.now();
                targetNode.source = 'ai'; // Mark as AI-generated for consistency

                // Apply targeted patches
                const applyPatch = (node: Task, path: string, value: any) => {
                    if (path === '/text') node.text = String(value);
                    if (path === '/description') node.description = String(value || '');
                    node.lastEdited = Date.now();
                };
                const idToNode: Map<string, Task> = new Map();
                const stack: Task[] = draftTasks.slice();
                while (stack.length) {
                    const n = stack.pop()!;
                    idToNode.set(n.id, n);
                    if (n.subtasks && n.subtasks.length) stack.push(...n.subtasks);
                }
                const updatedIds = new Set<string>();
                for (const u of altData.Updates || []) {
                    const target = idToNode.get(u['Target Id']);
                    if (!target) continue;
                    for (const ch of u.Changes || []) {
                        if (ch.Path === '/text' || ch.Path === '/description') {
                            applyPatch(target, ch.Path, ch.Value);
                            updatedIds.add(target.id);
                        }
                    }
                }

                updateProject({ ...targetProject, tasks: draftTasks });
                updateTaskAndPropagateStatus(targetProject.id, targetNode);

                // Mark indicators
                const now = Date.now();
                setRecentlyChanged(rc => ({
                    ...rc,
                    [targetNode.id]: { kind: 'updated', at: now },
                    ...Array.from(updatedIds).reduce((acc, id) => {
                        acc[id] = { kind: 'updated', at: now };
                        return acc;
                    }, {} as Record<string, { kind: 'new' | 'updated'; at: number }>)
                }));

                // Show summary dialog
                setAltChangesSummary({
                    replacedTitle: replaced.text,
                    updatedTargets: Array.from(updatedIds),
                    notes: (altData['Changes Summary']?.Notes as string[] | undefined) || undefined,
                });
                setIsAltSummaryDialogOpen(true);
                setIsConfirmationDialogOpen(false);
            } else {
                // subscope or regenerate
                const parentId = confirmationMode.targetTaskId;
                const path = parentId ? findTaskPath(targetProject.tasks, parentId) : null;
                const parentTask = path && path.length ? path[path.length - 1] : null;
                if (!parentTask) {
                    toast({ variant: 'destructive', title: 'Parent scope not found', description: 'Could not locate the target scope.' });
                    setIsGenerating(false);
                    return;
                }
                const finalParentText = refinedGoal || parentTask.text;
                toast({ title: confirmationMode.type === 'regenerate' ? 'Regenerating sub-scopes...' : 'Generating sub-scopes...' });
                const existingSubtaskNames = (parentTask.subtasks || []).map(t => t.text);
                const imageContext = (confirmationImage ? (confirmationImage as any).dataUri : undefined) ?? (goalImage ? (goalImage as any).dataUri : undefined);
                const gen = await handleGenerateTasks({
                    goal: finalParentText,
                    projectName: isUnassigned ? undefined : targetProject.name,
                    existingTasks: isUnassigned ? [] : existingSubtaskNames,
                    photoDataUri: imageContext,
                });
                if (!gen.success || !gen.data) {
                    toast({ variant: 'destructive', title: 'AI Generation Failed', description: gen.error || 'The AI did not return a valid structure.' });
                    setIsGenerating(false);
                    return;
                }
                const newSubtasks = convertRawToTasks(gen.data.raw, parentTask.id);
                if (confirmationMode.type === 'subscope') {
                    if (addSubtask(targetProject.id, parentTask.id, newSubtasks, false)) {
                        toast({ title: 'Sub-scopes generated!' });
                        const now = Date.now();
                        setRecentlyChanged(rc => ({
                            ...rc,
                            ...newSubtasks.reduce((acc, t) => { acc[t.id] = { kind: 'new', at: now }; return acc; }, {} as Record<string, { kind: 'new' | 'updated'; at: number }>)
                        }));
                    }
                } else {
                    // regenerate: replace children
                    const newProjectTasks = [...targetProject.tasks];
                    const updatePath = findTaskPath(newProjectTasks, parentTask.id);
                    if (updatePath.length > 0) {
                        const target = updatePath[updatePath.length - 1];
                        target.subtasks = newSubtasks;
                        target.lastEdited = Date.now();
                        updateProject({ ...targetProject, tasks: newProjectTasks });
                        updateTaskAndPropagateStatus(targetProject.id, target);
                        toast({ title: 'Sub-scopes regenerated!' });
                        const now = Date.now();
                        setRecentlyChanged(rc => ({
                            ...rc,
                            [target.id]: { kind: 'updated', at: now },
                            ...newSubtasks.reduce((acc, t) => { acc[t.id] = { kind: 'new', at: now }; return acc; }, {} as Record<string, { kind: 'new' | 'updated'; at: number }>)
                        }));
                    }
                }
                setIsConfirmationDialogOpen(false);
            }

        setGoal('');
      setGoalImage(null);
      setConfirmationInput('');
      setConfirmationImage(null);
      setAiConfirmationResponse(null);
      setRefinedGoal(null);
            setProposal(null);
    setConfirmationMode({ type: 'initial' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during generation.';
        toast({ variant: 'destructive', title: 'An unexpected error occurred', description: errorMessage });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCreateManualTemplate = () => {
    if (!isLoaded) return;

    const targetProjectId = activeProjectId || 'unassigned';
    const targetProject = projects.find(p => p.id === targetProjectId);

    if (!targetProject) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find a folder to add the template to.' });
        return;
    }
    
    const createSubSubTask = (text: string, parentId: string, order: number): Task => ({
        id: crypto.randomUUID(), text, completed: false, status: 'todo', subtasks: [], lastEdited: Date.now(),
        order, parentId, comments: [], executionResults: [], summaries: [], source: 'manual', description: 'A sub-sub-scope'
    });

    const createSubTask = (text: string, parentId: string, order: number, subSubTaskText: string): Task => {
        const subtaskId = crypto.randomUUID();
        return {
            id: subtaskId, text, completed: false, status: 'todo', subtasks: [createSubSubTask(subSubTaskText, subtaskId, 0)],
            lastEdited: Date.now(), order, parentId, comments: [], executionResults: [], summaries: [], source: 'manual', description: 'A sub-scope'
        };
    };

    const mainTaskId = crypto.randomUUID();
    const mainTask: Task = {
        id: mainTaskId,
        text: 'Main Task',
        description: 'This is a manually created template with nested scopes.',
        completed: false,
        status: 'todo',
        subtasks: [
            createSubTask('Subtask 1', mainTaskId, 0, 'Sub-subtask 1.1'),
            createSubTask('Subtask 2', mainTaskId, 1, 'Sub-subtask 2.1')
        ],
        lastEdited: Date.now(),
        order: Math.max(-1, ...targetProject.tasks.map(t => t.order)) + 1,
        parentId: null,
        comments: [],
        executionResults: [],
        summaries: [],
        source: 'manual'
    };

    updateProject({ ...targetProject, tasks: [...targetProject.tasks, mainTask] });
    toast({ title: 'Manual template created!', variant: 'default' });

    if (!activeProjectId) {
        setActiveItem({ projectId: targetProjectId, taskId: null });
    }
  };
  
  const handleProjectNameChange = (e: React.FormEvent<HTMLInputElement>) => {
    if (activeProject) {
        updateProject({...activeProject, name: e.currentTarget.value });
    }
  }

  const handleProjectNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        setIsEditingProjectName(false);
    }
  }
  
  const handleSaveDescription = () => {
    if(activeProject) {
        updateProject({ ...activeProject, description: descriptionText });
        setIsEditingDescription(false);
    }
  };
  
  const resetActiveTask = () => {
      if (activeProjectId) {
          setActiveItem({ projectId: activeProjectId, taskId: null });
      }
  };

  const handleOpenCommentDialog = (task: Task) => {
    setCommentingTask(task);
    setNewCommentText('');
  }

  const handleCloseCommentDialog = () => {
    setCommentingTask(null);
    setNewCommentText('');
  }

  const handleSaveComment = () => {
    if (commentingTask && newCommentText.trim() && activeProjectId) {
        if(addCommentToTask(activeProjectId, commentingTask.id, newCommentText.trim())) {
          toast({ title: 'Comment added', variant: 'default' });
        }
        handleCloseCommentDialog();
    }
  }

  const handleGenerateSummary = async () => {
    if (!activeProject) return;

    const itemToSummarize = activeTask || activeProject;
    const summaries = itemToSummarize.summaries || [];
    const latestSummary = summaries.length > 0 ? summaries[0].text : undefined;
    
    toast({ title: 'Generating summary...', description: `The AI is analyzing "${'name' in itemToSummarize ? itemToSummarize.name : itemToSummarize.text}".` });
    
    const result = await handleGenerateProjectSummary(activeProject, activeTask || undefined, latestSummary);
    
     if (result.success && result.summary) {
        if (activeTask) {
            addSummaryToTask(activeProject.id, activeTask.id, result.summary);
        } else {
            addSummaryToProject(activeProject.id, result.summary);
        }
        toast({ title: 'Summary generated!', variant: 'default' });
    } else {
        toast({ title: 'Generation Failed', description: result.error, variant: 'destructive' });
    }
  }

  const handleOpenExecuteDialog = (task: Task) => {
    setExecutingTask(task);
    setExecutionInput('');
  };

  const handleCloseExecuteDialog = () => {
    setExecutingTask(null);
    setExecutionInput('');
  };

  const handleExecuteTask = async () => {
    if (executingTask && activeProject) {
      const isUnassigned = activeProject.id === 'unassigned';
      const taskPath = findTaskPath(activeProject.tasks, executingTask.id);
      const parentTask = taskPath.length > 1 ? taskPath[taskPath.length - 2] : null;
      const siblingTasks = parentTask ? parentTask.subtasks : activeProject.tasks;
      const otherTasks = isUnassigned ? [] : siblingTasks.map(t => t.text).filter(t => t !== executingTask.text);
      
      const success = await executeTask(
          activeProject.id, 
          executingTask.id, 
          executingTask.text,
          executionInput,
          isUnassigned ? undefined : activeProject.name,
          otherTasks
      );

      if (success) {
          toast({ title: 'Scope executed!', description: 'The results have been added to the Execution tab.', variant: 'default' });
          handleCloseExecuteDialog();
          setActiveTab('execution');
      } else {
           toast({ title: 'Execution Failed', description: "There was an issue with the AI execution.", variant: 'destructive' });
      }
    }
  };

    const _handleDeleteSelected = () => {
    if(activeProjectId && selectedTaskIds.length > 0) {
        if(deleteSelectedTasks(activeProjectId, selectedTaskIds)) {
            toast({ title: `${selectedTaskIds.length} scope(s) deleted`, variant: 'default' });
        }
    }
  };
  
  const viewOptions: Record<string, { label: string; icon: React.ElementType; hidden?: boolean }> = {
    'list': { label: 'List View', icon: ListTree },
    'mindmap': { label: 'Mind Map', icon: Waypoints },
    'kanban': { label: 'Kanban View', icon: KanbanSquare },
    'execution': { label: 'Execution', icon: Zap },
    'comments': { label: 'Comments', icon: MessageSquare },
    'summary': { label: 'Summary', icon: FileText },
  };

  const visibleViewOptions = Object.entries(viewOptions).filter(([, { hidden }]) => !hidden);
  
    // Human-readable preview for confirmation: pretty JSON
    const renderConfirmationJson = (data: any) => {
        const text = prettyPrintJson(data);
        if (!text) return null;
        return (
            <pre className="text-xs md:text-sm whitespace-pre-wrap break-words">{text}</pre>
        );
    };

  const formatTaskToMarkdown = (task: Task, level: number): string => {
    const prefix = '#'.repeat(level + 1);
    let markdown = `${prefix} ${task.text}\n\n`;

    if (task.description) {
        markdown += `${task.description}\n\n`;
    }

    if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
            markdown += formatTaskToMarkdown(subtask, level + 1);
        });
    }

    return markdown;
  };

  const handleExportProject = (project: Project) => {
      const zip = new JSZip();
      let markdownContent = `# ${project.name}\n\n`;
      if (project.description) {
          markdownContent += `${project.description}\n\n`;
      }
      project.tasks.forEach(task => {
          markdownContent += formatTaskToMarkdown(task, 1);
      });

      zip.file(`${project.name}.md`, markdownContent);
      zip.generateAsync({ type: 'blob' }).then(content => {
          saveAs(content, `${project.name}.zip`);
      });
      toast({ title: 'Exporting project...', description: `"${project.name}" is being prepared for download.` });
  };

  if (authLoading && !isLoaded) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground font-sans">
          {isLoaded && (
            <div className="flex">
              <Sidebar
                  isOpen={isSidebarOpen}
                  onSetIsOpen={setIsSidebarOpen}
                  width={sidebarWidth}
                  projects={sortedProjects}
                  activeProjectId={activeProjectId}
                  activeTaskId={activeTaskId}
                  onItemSelect={setActiveItem}
                  onCreateProject={(name) => {
                    const id = createProject(name);
                    if (id) {
                      toast({ title: `Folder "${name}" created.` });
                      setActiveItem({ projectId: id, taskId: null });
                    }
                  }}
                  onCreateTask={(projectId, taskName) => {
                    const id = createTaskInProject(projectId, taskName);
                    if (id) {
                      toast({ title: `Scope "${taskName}" created.` });
                    }
                  }}
                  onDeleteProject={(id) => {
                    if (deleteProject(id)) {
                      toast({ title: 'Folder deleted' });
                    }
                  }}
                  onUpdateProject={updateProject}
                  onDeleteTask={(projectId, taskId) => {
                    if(deleteTask(projectId, taskId)) {
                        toast({ title: 'Scope deleted' });
                    }
                  }}
                  onMoveTask={(taskId, sourceId, targetId) => {
                    if (moveTaskToProject(taskId, sourceId, targetId)) {
                        toast({ title: 'Scope moved.' });
                    }
                  }}
                  onPromoteSubtask={(projectId, taskId) => {
                    if (promoteSubtaskToTask(projectId, taskId)) {
                      toast({ title: 'Scope promoted.' });
                    }
                  }}
                  onExportProject={handleExportProject}
                  sortOption={projectSortOption}
                  onSetSortOption={setProjectSortOption}
              />
              <div 
                  onMouseDown={handleMouseDown}
                  className={cn(
                    "w-1.5 h-full cursor-col-resize bg-border/50 hover:bg-primary transition-colors",
                    isResizing && "bg-primary",
                    !isSidebarOpen && "hidden"
                  )}
              />
            </div>
          )}
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="p-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <LayoutPanelLeft />
                        </Button>
                        <div className="flex items-center gap-2">
                            {isEditingProjectName && activeProject ? (
                                <Input
                                    value={activeProject.name}
                                    onChange={handleProjectNameChange}
                                    onBlur={() => setIsEditingProjectName(false)}
                                    onKeyDown={handleProjectNameKeyDown}
                                    className="text-xl font-semibold p-2 h-auto"
                                    autoFocus
                                />
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="text-xl font-semibold p-2 h-auto" disabled={!activeProject}>
                                            {activeProject?.name || 'Select a Folder'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Switch Folder</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {sortedProjects.filter(p => p.id !== activeProjectId).map(p => (
                                            <DropdownMenuItem key={p.id} onClick={() => setActiveItem({projectId: p.id, taskId: null})}>
                                                <span>{p.name}</span>
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => {
                                            const newId = createProject('New Folder');
                                            if(newId){
                                              toast({title: 'Folder "New Folder" created.'});
                                              setActiveItem({projectId: newId, taskId: null});
                                            }
                                        }}>
                                            Create New Folder
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {activeProject && !isEditingProjectName && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingProjectName(true)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl+Y)">
                            <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsHistoryOpen(true)} title="History">
                            <History className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                                    <Avatar>
                                        <AvatarImage src={user?.photoURL || undefined} />
                                        <AvatarFallback>{user?.displayName?.substring(0, 1) || user?.email?.substring(0, 1) || <User />}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {user ? (
                                    <>
                                        <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                                            <Settings className="mr-2"/> Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setIsHelpOpen(true)}>
                                            <HelpCircle className="mr-2"/> Help
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={logOut}>
                                            <LogOut className="mr-2"/> Sign Out
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <DropdownMenuItem onClick={() => setIsAuthDialogOpen(true)}>
                                        <User className="mr-2"/> Login / Sign Up
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                 {activeProject && (
                    <div className="mt-2 pl-12">
                        {isEditingDescription ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={descriptionText}
                                    onChange={(e) => setDescriptionText(e.target.value)}
                                    placeholder="Add a folder description..."
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button onClick={() => setIsEditingDescription(false)} variant="ghost" size="sm">Cancel</Button>
                                    <Button onClick={handleSaveDescription} size="sm"><Save className="mr-2"/>Save</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground group flex items-center gap-2">
                                <p className="flex-grow">{descriptionText || 'No description yet. Add one!'}</p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <Button onClick={() => setIsEditingDescription(true)} variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div>
                     {isLoaded && activeProject && (
                        <div className="mb-4">
                            {/* Tabs for larger screens */}
                            <div className="hidden md:block">
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList>
                                        {visibleViewOptions.map(([key, { label, icon: Icon }]) => (
                                            <TabsTrigger key={key} value={key}>
                                                <Icon className="mr-2" />
                                                {label}
                                                {key === 'comments' && totalCommentCount > 0 && <Badge className="ml-2 h-5">{totalCommentCount}</Badge>}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {/* Dropdown for smaller screens */}
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            <span>{viewOptions[activeTab as keyof typeof viewOptions].label}</span>
                                            <Menu />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                        {visibleViewOptions.map(([key, { label, icon: Icon }]) => (
                                            <DropdownMenuItem key={key} onSelect={() => setActiveTab(key)}>
                                                <Icon className="mr-2" />
                                                {label}
                                                 {key === 'comments' && totalCommentCount > 0 && <Badge className="ml-auto h-5">{totalCommentCount}</Badge>}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    )}

                    <form onSubmit={onFormSubmit} className="mb-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-2">
                            <Input 
                                id="goal-input"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                placeholder={"What do you want to accomplish?"}
                                className="text-base flex-grow"
                                disabled={isGenerating || !isLoaded}

                            />
                             <div className="flex w-full md:w-auto items-center justify-end gap-2 flex-shrink-0">
                                <Button size="icon" type="submit" disabled={isGenerating || !goal.trim() || !isLoaded}>
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Plus />}
                                </Button>
                                <Button size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
                                    <ImagePlus />
                                </Button>
                                <Button onClick={handleCreateManualTemplate} disabled={!isLoaded}>
                                    <FilePlus2 />
                                    <span>Blank Template</span>
                                </Button>
                             </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, setGoalImage)}
                        />
                        {goalImage && (
                            <div className="mt-2 relative w-32 h-32 rounded-md overflow-hidden border">
                                <Image src={goalImage.dataUri} alt="Preview" layout="fill" objectFit="cover" />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6"
                                    onClick={() => setGoalImage(null)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </form>

                    {isLoaded && activeProject ? (
                        <div className="flex items-center text-sm text-muted-foreground mb-4 flex-wrap">
                            <button className="hover:underline" onClick={resetActiveTask}>
                                {activeProject.name}
                            </button>
                            {breadcrumbPath.map((task, index) => (
                                <div key={task.id} className="flex items-center">
                                    <ChevronRight className="h-4 w-4 mx-1" />
                                    {index < breadcrumbPath.length - 1 ? (
                                         <button 
                                            className="hover:underline"
                                            onClick={() => setActiveItem({projectId: activeProject.id, taskId: task.id})}
                                         >
                                            {task.text}
                                         </button>
                                    ) : (
                                        <span className="font-semibold text-foreground truncate">{task.text}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null }

                    {isLoaded && activeProject ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="hidden">
                                {Object.entries(viewOptions).map(([key]) => (
                                    <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
                                ))}
                            </TabsList>
                            <TabsContent value="list">
                                <TreeView 
                                    tasks={activeTask ? [activeTask] : activeProject.tasks}
                                    project={activeProject}
                                    allProjects={projects}
                                    selectedTaskIds={selectedTaskIds}
                                    onSetSelectedTaskIds={setSelectedTaskIds}
                                    onUpdateTaskAndPropagate={updateTaskAndPropagateStatus}
                                    onUpdateProject={updateProject}
                                    onMoveTask={(...args) => {
                                      if (moveTaskToProject(...args)) {
                                        toast({ title: 'Scope moved' });
                                      }
                                    }}
                                    onPromoteSubtask={(...args) => {
                                      if (promoteSubtaskToTask(...args)) {
                                        toast({ title: 'Scope promoted' });
                                      }
                                    }}
                                    onAddSubtask={(...args) => {
                                      if (addSubtask(...args)) {
                                        toast({ title: 'Sub-scope added' });
                                      }
                                    }}
                                    onAddCommentClick={handleOpenCommentDialog}
                                    onExecuteClick={handleOpenExecuteDialog}
                                    onDeleteTask={(projectId, taskId) => {
                                      if (deleteTask(projectId, taskId)) {
                                          toast({ title: 'Scope deleted', variant: 'default' });
                                      }
                                    }}
                                    sortOption={taskSortOption}
                                    onSetSortOption={setTaskSortOption}
                                    recentlyChanged={recentlyChanged}
                                                                                                            onOpenSubscopeDialog={(task, isRegen) => {
                                        // Open unified dialog pre-populated with the selected scope and mode
                                        setRefinedGoal(task.text);
                                        setAiConfirmationResponse({ raw: task.text });
                                        setConfirmationInput('');
                                        setConfirmationImage(null);
                                        setConfirmationMode({ type: isRegen ? 'regenerate' : 'subscope', targetTaskId: task.id });
                                                                                                                    setProposal(''); // placeholder while loading
                                                                                                                    setIsConfirmationDialogOpen(true);
                                                                                                                    // Fetch proposal preview async
                                                                                                                    (async () => {
                                                                                    const siblings = (task.parentId ? findTaskPath((activeProject as Project).tasks, task.parentId).at(-1)?.subtasks || [] : (activeProject as Project).tasks).filter(t => t.id !== task.id).map(t => t.text);
                                                                                    const existingChildren = (task.subtasks || []).map(t => t.text);
                                                                                    const parentPathTitles = findTaskPath((activeProject as Project).tasks, task.id).map(t => t.text).slice(0, -1);
                                                                                    const res = await handleProposeChanges({
                                                                                        mode: isRegen ? 'regenerate' : 'subscope',
                                                                                        targetText: task.text,
                                                                                        projectName: activeProject?.name,
                                                                                        parentPathTitles,
                                                                                        siblingTitles: siblings,
                                                                                        existingChildren,
                                                                                    });
                                                                                                                        if (res.success && res.data) setProposal(res.data);
                                                                                                                        else setProposal(null);
                                                                                })();
                                    }}
                                    onOpenRephraseDialog={(task) => {
                                        setRefinedGoal(task.text);
                                        setAiConfirmationResponse({ raw: task.text });
                                        setConfirmationInput('');
                                        setConfirmationImage(null);
                                        // Switch to 'alternative' behavior replacing the node and updating related items
                                                                                setConfirmationMode({ type: 'alternative', targetTaskId: task.id });
                                                                                                                    setProposal('');
                                                                                                                    setIsConfirmationDialogOpen(true);
                                                                                                                    // Proposal for alternative
                                                                                                                    (async () => {
                                                                                    const path = findTaskPath((activeProject as Project).tasks, task.id);
                                                                                    const parentTitles = path.map(t => t.text).slice(0, -1);
                                                                                    const siblings = (task.parentId ? findTaskPath((activeProject as Project).tasks, task.parentId).at(-1)?.subtasks || [] : (activeProject as Project).tasks).filter(t => t.id !== task.id).map(t => t.text);
                                                                                    const res = await handleProposeChanges({
                                                                                        mode: 'alternative',
                                                                                        targetText: task.text,
                                                                                        projectName: activeProject?.name,
                                                                                        parentPathTitles: parentTitles,
                                                                                        siblingTitles: siblings,
                                                                                    });
                                                                                                                        if (res.success && res.data) setProposal(res.data);
                                                                                                                        else setProposal(null);
                                                                                })();
                                    }}
                                />
                            </TabsContent>
                            <TabsContent value="mindmap">
                                <MindMapView 
                                    project={activeProject}
                                    activeTask={activeTask}
                                    onItemSelect={(taskId) => setActiveItem({ projectId: activeProject.id, taskId })}
                                />
                            </TabsContent>
                            <TabsContent value="kanban">
                                <KanbanView
                                  project={activeProject}
                                  activeTask={activeTask}
                                  onUpdateTaskAndPropagate={updateTaskAndPropagateStatus}
                                  onItemSelect={(selection) => setActiveItem({ ...selection })}
                                />
                            </TabsContent>
                             <TabsContent value="comments">
                                <CommentsView 
                                    project={activeProject}
                                    activeTask={activeTask || undefined}
                                    onAddComment={(...args) => {
                                        const result = addCommentToTask(...args);
                                        if (result) {
                                            toast({ title: 'Comment added', variant: 'default' });
                                        }
                                        return result;
                                    }}
                                    onAddReply={(...args) => {
                                        const result = addReplyToComment(...args);
                                        if (result) {
                                            toast({ title: 'Reply added', variant: 'default' });
                                        }
                                        return result;
                                    }}
                                    onUpdateComment={(...args) => {
                                        const result = updateComment(...args);
                                        if (result) {
                                            toast({ title: 'Comment updated', variant: 'default' });
                                        }
                                        return result;
                                    }}
                                    onDeleteComment={(...args) => {
                                        const result = deleteComment(...args);
                                        if (result) {
                                            toast({ title: 'Comment deleted', variant: 'default' });
                                        }
                                        return result;
                                    }}
                                    onItemSelect={(taskId) => setActiveItem({ projectId: activeProject.id, taskId: taskId })}
                                />
                            </TabsContent>
                             <TabsContent value="execution">
                                <ExecutionView
                                    project={activeProject}
                                    activeTask={activeTask}
                                    onItemSelect={(taskId) => setActiveItem({ projectId: activeProject.id, taskId: taskId })}
                                />
                            </TabsContent>
                            <TabsContent value="summary">
                                <SummaryView 
                                    project={activeProject}
                                    activeTask={activeTask}
                                    onGenerateSummary={handleGenerateSummary}
                                />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="text-center text-muted-foreground mt-16 border-2 border-dashed rounded-lg p-12">
                        {isLoaded ? (
                            <>
                                <h3 className='text-xl font-semibold mb-2'>Welcome to Scope</h3>
                                <p className="mb-4">Scope out. Dive Deep. Complete.</p>
                                <p>Select a folder from the sidebar to view its scopes.</p>
                                <p className='mt-2'>Or, type a new scope above to get started!</p>
                            </>
                        ) : (
                            <>
                                <Loader2 className="mx-auto animate-spin h-8 w-8 mb-4" />
                                <p>Loading folders...</p>
                            </>
                        )}
                        </div>
                    )}
                </div>
            </main>
        </div>
        <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Help & Information</DialogTitle>
                    <DialogDescription>
                        Learn how to use Scope to its full potential.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>What is Scope?</AccordionTrigger>
                            <AccordionContent>
                            Scope is a tool for breaking down complex goals into manageable, hierarchical scopes. Use it to plan projects, create checklists, brainstorm ideas, and more. The application leverages AI to help you generate, refine, and execute these scopes, turning high-level ideas into actionable plans.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Folders & Scopes</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                <p><strong className="font-semibold">Folders:</strong> ( <Folder className="inline-block" /> ) Represent high-level projects or containers for your work. You can create, rename, and sort them in the sidebar.</p>
                                <p><strong className="font-semibold">Scopes:</strong> ( <File className="inline-block" /> ) Are individual tasks or ideas. They can be nested to create a hierarchy. A scope with sub-scopes acts as a parent, and its status (To Do, In Progress, Done) is automatically calculated based on its children.</p>
                                <p><strong className="font-semibold">Adding Scopes:</strong> Use the main input bar at the top. Type your goal and click "Add Scope". The AI will treat it as a case study, breaking it down into a structured list of sub-scopes for you.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>Using the AI</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                <p><strong className="font-semibold">Generate Scopes (Case Study Method):</strong> ( <Bot className="inline-block text-primary" /> ) The primary way to use the AI. Describe a goal, and the AI will act as a consultant, breaking it down into a hierarchical plan (L1, L2, L3...) and providing a synthesis.</p>
                                <p><strong className="font-semibold">Execute:</strong> ( <ZapIcon className="inline-block text-yellow-500" /> ) On any scope, use the "Execute" action to have the AI perform a deep-dive case study on the topic and provide a detailed report. Results appear in the "Execution" view.</p>
                                <p><strong className="font-semibold">Rephrase Scope Title:</strong> ( <Pencil className="inline-block text-cyan-500" /> ) Refine the text of a scope without changing its children.</p>
                                <p><strong className="font-semibold">Generate Sub-scopes:</strong> ( <BrainCircuit className="inline-block text-primary" /> ) Ask AI to add new sub-scopes under a scope (append).</p>
                                <p><strong className="font-semibold">Regenerate Sub-scopes:</strong> ( <RotateCw className="inline-block text-blue-500" /> ) Replace all existing sub-scopes under a scope with a fresh AI-generated set.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>Content Views</AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                <p><strong className="font-semibold">List View:</strong> ( <List className="inline-block" /> ) The primary hierarchical view for managing your scopes.</p>
                                <p><strong className="font-semibold">Mind Map:</strong> ( <MapIcon className="inline-block" /> ) A visual representation of your scope hierarchy, great for brainstorming and understanding relationships.</p>
                                <p><strong className="font-semibold">Kanban View:</strong> ( <Columns className="inline-block" /> ) A board view organizing scopes by their status (To Do, In Progress, Done).</p>
                                <p><strong className="font-semibold">Execution, Comments, Summary:</strong> These views show AI execution results, user comments, and AI-generated summaries for the selected folder or scope.</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <Button onClick={() => setIsHelpOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        {/* Simple history info modal (list only; undo/redo are buttons in header) */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>History</DialogTitle>
                    <DialogDescription>Use Undo/Redo in the header to revert or reapply changes.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1">Past (oldest → newest)</div>
                        <ul className="max-h-48 overflow-auto border rounded p-2 text-sm">
                            {historyPast.length === 0 ? (
                                <li className="text-muted-foreground">No history yet</li>
                            ) : (
                                historyPast.map((h, i) => (
                                    <li key={i} className="py-1 border-b last:border-b-0">
                                        <div className="font-medium">{h.label || 'Change'}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1">Future (will redo)</div>
                        <ul className="max-h-24 overflow-auto border rounded p-2 text-sm">
                            {historyFuture.length === 0 ? (
                                <li className="text-muted-foreground">Empty</li>
                            ) : (
                                historyFuture.map((h, i) => (
                                    <li key={i} className="py-1 border-b last:border-b-0">
                                        <div className="font-medium">{h.label || 'Change'}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsHistoryOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={!!commentingTask} onOpenChange={(isOpen) => !isOpen && handleCloseCommentDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add comment to scope</DialogTitle>
                    <DialogDescription>
                        {commentingTask?.text}
                    </DialogDescription>
                </DialogHeader>
                <Textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Your comment..."
                    rows={4}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={handleCloseCommentDialog}>Cancel</Button>
                    <Button onClick={handleSaveComment} disabled={!newCommentText.trim()}>Save Comment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
         <Dialog open={!!executingTask} onOpenChange={(isOpen) => !isOpen && handleCloseExecuteDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Execute Scope</DialogTitle>
                    <DialogDescription>
                        The AI will attempt to research and complete this scope. You can provide additional instructions or context below.
                        <div className="font-semibold mt-2">{executingTask?.text}</div>
                    </DialogDescription>
                </DialogHeader>
                <Textarea 
                    value={executionInput}
                    onChange={(e) => setExecutionInput(e.target.value)}
                    placeholder="e.g., 'Focus on solutions for a small business' or 'Provide code examples in Python'."
                    rows={4}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={handleCloseExecuteDialog}>Cancel</Button>
                    <Button onClick={handleExecuteTask}>
                        <Zap className="mr-2"/>
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
            <Dialog open={isConfirmationDialogOpen} onOpenChange={(open) => { setIsConfirmationDialogOpen(open); if (!open) setProposal(null); }}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
                                <DialogHeader>
                    <DialogTitle>
                        {isRefineMode ? 'Refine' : (
                            confirmationMode.type === 'initial' ? 'Accept & add scopes' :
                            confirmationMode.type === 'subscope' ? 'Accept & generate sub-scopes' :
                            confirmationMode.type === 'regenerate' ? 'Accept & regenerate sub-scopes' :
                            'Accept & replace with alternative'
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isRefineMode
                            ? 'Add details or feedback, then click “Refine scope” to iterate. Repeat until you are satisfied.'
                            : (
                                confirmationMode.type === 'initial'
                                    ? 'Review the scope. When you are ready, click “Accept & add scopes” to generate tasks.'
                                    : confirmationMode.type === 'subscope'
                                        ? 'Review the parent scope and any notes. When ready, click “Accept & generate sub-scopes”.'
                                        : confirmationMode.type === 'regenerate'
                                            ? 'Review the parent scope and any notes. When ready, click “Accept & regenerate sub-scopes”.'
                                            : 'Replace this scope with an alternative and update only truly dependent items.'
                            )}
                    </DialogDescription>
                </DialogHeader>
                
                                                                <ScrollArea className="flex-grow border rounded-md p-4 bg-background/50 space-y-3">
                                                                                <div>
                                                                                        <div className="text-xs uppercase text-muted-foreground mb-1">Current scope</div>
                                                                                        {renderConfirmationJson(refinedGoal ?? aiConfirmationResponse?.raw ?? goal)}
                                                                                </div>
                                                                                                                        {confirmationMode.type !== 'initial' && (
                                                                                                                            <div>
                                                                                                                                <div className="text-xs uppercase text-muted-foreground mb-1">Proposed changes (preview)</div>
                                                                                                                                <div className="text-sm whitespace-pre-wrap">
                                                                                                                                    {proposal === '' && <span className="text-muted-foreground">Preparing preview…</span>}
                                                                                                                                    {proposal === null && <span className="text-muted-foreground">No preview available.</span>}
                                                                                                                                    {typeof proposal === 'string' && proposal !== '' && <span>{proposal}</span>}
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        )}
                                                                </ScrollArea>
                 <div className="space-y-2 mt-4">
                    <Label htmlFor="confirmation-input">Add details or feedback (optional)</Label>
                    <Textarea
                        id="confirmation-input"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder="e.g., 'Make the first step more detailed' or 'Add a section about marketing'."
                        rows={3}
                    />
                </div>
                 <div className="space-y-2 mt-2">
                    <Label>Add an image for more context (optional)</Label>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            id="confirmation-file-input"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, setConfirmationImage)}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('confirmation-file-input')?.click()}>
                            <ImagePlus className="mr-2" />
                            Upload Image
                        </Button>
                        {confirmationImage && (
                             <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                                <Image src={confirmationImage.dataUri} alt="Preview" layout="fill" objectFit="cover" />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-0 right-0 h-5 w-5"
                                    onClick={() => setConfirmationImage(null)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                                                <DialogFooter className="mt-4">
                                                        <Button variant="ghost" onClick={() => setIsConfirmationDialogOpen(false)}>Cancel</Button>
                                                        {isRefineMode ? (
                                                            <Button onClick={handleAcceptConfirmation} disabled={isGenerating}>
                                                                {isGenerating ? <Loader2 className="animate-spin" /> : 'Refine scope'}
                                                            </Button>
                                                        ) : (
                                                            <Button onClick={handleAcceptConfirmation} disabled={isGenerating}>
                                                                {isGenerating ? (
                                                                    <Loader2 className="animate-spin" />
                                                                ) : confirmationMode.type === 'initial' ? (
                                                                    'Accept & add scopes'
                                                                ) : confirmationMode.type === 'subscope' ? (
                                                                    'Accept & generate sub-scopes'
                                                                ) : confirmationMode.type === 'regenerate' ? (
                                                                    'Accept & regenerate sub-scopes'
                                                                ) : (
                                                                    'Accept & replace with alternative'
                                                                )}
                                                            </Button>
                                                        )}
                                                </DialogFooter>
            </DialogContent>
        </Dialog>
        {/* Alternative changes summary dialog */}
        <Dialog open={isAltSummaryDialogOpen} onOpenChange={setIsAltSummaryDialogOpen}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Changes applied</DialogTitle>
                    <DialogDescription>We replaced the scope and updated related items.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    {altChangesSummary && (
                        <>
                            <div><span className="font-semibold">New Title:</span> {altChangesSummary.replacedTitle}</div>
                            <div><span className="font-semibold">Updated Items:</span> {altChangesSummary.updatedTargets.length}</div>
                            {altChangesSummary.notes && altChangesSummary.notes.length > 0 && (
                                <div>
                                    <div className="font-semibold">Notes</div>
                                    <ul className="list-disc pl-5">
                                        {altChangesSummary.notes.map((n, i) => (<li key={i}>{n}</li>))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsAltSummaryDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    </TooltipProvider>
  );
}
