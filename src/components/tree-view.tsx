
'use client';
import { useState, useCallback, useContext, createContext, useRef, useEffect, useMemo } from 'react';
import type { Project, Task, AIStep, TaskStatus, SortOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BrainCircuit, Trash2, RotateCw, FolderSymlink, ChevronRight, MoreHorizontal, PlusCircle, MessageSquare, Pencil, Zap, ArrowUp, ArrowDown, ClipboardCopy, CheckSquare, Square, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { handleGenerateTasks } from '@/app/actions';
import { Button } from './ui/button';
import Linkify from 'linkify-react';
import { Input } from './ui/input';
// import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { countDirectSubtasks, sortTasksShallow, findTaskRecursive } from '@/lib/utils';
// Persona feature removed
// Legacy dialog removed; unified dialog lives in page component
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
// import Image from 'next/image';
// import { ScrollArea } from './ui/scroll-area';

// File reading utility removed with legacy dialog

type TreeViewProps = {
  tasks: Task[]; // Now accepts a list of scopes directly
  project: Project; // Still need the folder for context (e.g., moving scopes)
  allProjects: Project[];
  selectedTaskIds: string[];
  onSetSelectedTaskIds: (ids: string[]) => void;
  onUpdateProject: (project: Project) => void;
  onUpdateTaskAndPropagate: (projectId: string, task: Task) => void;
  onMoveTask: (taskId: string, sourceProjectId: string, targetProjectId: string) => void;
  onPromoteSubtask: (projectId: string, taskId: string) => void;
  onAddSubtask: (projectId: string, parentId: string, subtasks: Task[], isSibling: boolean) => void;
  onAddCommentClick: (task: Task) => void;
  onExecuteClick: (task: Task) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
    /** Open the unified confirmation/refine dialog in the page for generating or regenerating sub-scopes. */
    onOpenSubscopeDialog: (task: Task, isRegeneration: boolean) => void;
    /** Open the unified confirmation/refine dialog for rephrasing the scope title only. */
    onOpenRephraseDialog: (task: Task) => void;
    /** Optional: Row-level change indicators to highlight new/updated items */
    recentlyChanged?: Record<string, { kind: 'new' | 'updated'; at: number }>;
};

// Context for managing tree state
type TreeStateContextType = {
  collapsedNodes: Record<string, boolean>;
  toggleNode: (nodeId: string) => void;
  setAllNodesCollapsed: (isCollapsed: boolean, tasks: Task[]) => void;
  allNodesCollapsed: boolean;
};

const TreeStateContext = createContext<TreeStateContextType | null>(null);

const useTreeState = () => {
    const context = useContext(TreeStateContext);
    if (!context) {
        throw new Error('useTreeState must be used within a TreeStateProvider');
    }
    return context;
};

const statusMap: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
};

const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-gray-400',
    inprogress: 'bg-blue-500',
    done: 'bg-green-500',
};

const AddSubtaskForm = ({ parentId, onAdd, onCancel, placeholder, isSibling }: { parentId: string, onAdd: (text: string) => void, onCancel: () => void, placeholder: string, isSibling?: boolean }) => {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (text.trim()) {
            onAdd(text.trim());
        }
    }
    
    // Using onMouseDown to prevent blur from firing before click
    const handleMouseDownOnButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); 
    };

    const handleBlur = (e: React.FocusEvent) => {
        // If the form itself is still focused (e.g., clicking the button), don't cancel.
        if (formRef.current?.contains(e.relatedTarget)) {
            return;
        }
        onCancel();
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} onBlur={handleBlur} className={cn("flex items-center gap-2 pr-2 py-1", isSibling ? "pl-6" : "pl-10")}>
            <Input 
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancel();
                    }
                }}
            />
            <Button type="submit" size="sm" disabled={!text.trim()} onMouseDown={handleMouseDownOnButton}>Save</Button>
        </form>
    );
}


const TaskNode = ({ 
    task, 
    level, 
    allProjects,
    project,
    selectedTaskIds,
    onToggleSelection,
    onUpdateTask,
    onDeleteTask, 
    onAddSubtask,
    onAddCommentClick,
    onExecuteClick,
    
    sortOption,
    onOpenSubscopeDialog,
    onOpenRephraseDialog,
    recentlyChanged,
}: { 
    task: Task, 
    level: number,
    allProjects: Project[],
    project: Project,
    selectedTaskIds: string[],
    onToggleSelection: (taskId: string, isShiftClick: boolean) => void,
    onUpdateTask: (task: Task) => void;
    onDeleteTask: (projectId: string, taskId: string) => void;
    onAddSubtask: (parentId: string, subtasks: Task[], isSibling: boolean) => void;
    onAddCommentClick: (task: Task) => void;
    onExecuteClick: (task: Task) => void;
    sortOption: SortOption;
    onOpenSubscopeDialog: (task: Task, isRegeneration: boolean) => void;
    onOpenRephraseDialog: (task: Task) => void;
    recentlyChanged?: Record<string, { kind: 'new' | 'updated'; at: number }>;
}) => {
  const { collapsedNodes, toggleNode } = useTreeState();
    const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
    const [isAdding, setIsAdding] = useState<{ open: boolean, type: 'child' | 'sibling' }>({ open: false, type: 'child' });
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = selectedTaskIds.includes(task.id);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
      setEditedText(task.text);
  }, [task.text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(e.target.value);
  }

  const handleSaveText = () => {
    if (editedText.trim() && editedText.trim() !== task.text) {
        onUpdateTask({ ...task, text: editedText.trim() });
    }
    setIsEditing(false);
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveText();
    } else if (e.key === 'Escape') {
      setEditedText(task.text);
      setIsEditing(false);
    }
  }


  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isCollapsed = collapsedNodes[task.id];
  const subtaskCounts = hasSubtasks ? countDirectSubtasks(task.subtasks) : { completed: 0, total: 0 };
  
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNode(task.id);
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdateTask({ ...task, status: newStatus });
  };
  
    // Preserve original order for children; main page sorting should only affect top-level scopes
    const sortedSubtasks = hasSubtasks ? task.subtasks : [];

  const statusSelector = (
    <Select value={task.status} onValueChange={handleStatusChange} disabled={hasSubtasks}>
        <SelectTrigger 
          className={cn(
            "w-auto h-auto p-0 border-none bg-transparent shadow-none focus:ring-0 gap-2",
            hasSubtasks && "cursor-not-allowed"
          )}
        >
           <SelectValue>
               <Tooltip>
                    <TooltipTrigger asChild>
                        <div 
                            className={cn(
                                "w-3 h-3 rounded-full border border-black/10 shadow-sm", 
                                statusColors[task.status]
                            )} 
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{hasSubtasks ? "Edit sub-scopes to change status" : `Status: ${statusMap[task.status]}`}</p>
                    </TooltipContent>
                </Tooltip>
           </SelectValue>
        </SelectTrigger>
        <SelectContent>
            {(Object.keys(statusMap) as TaskStatus[]).map(s => (
                <SelectItem key={s} value={s}>
                   <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", statusColors[s])} />
                        {statusMap[s]}
                   </div>
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
  );
  
  const handleAddClick = (e: React.MouseEvent, type: 'child' | 'sibling') => {
      e.stopPropagation();
      setIsAdding({ open: true, type });
  };

  const handleAddSubmit = (text: string) => {
      onAddSubtask(task.id, [{
        id: crypto.randomUUID(),
        text,
        status: 'todo',
        completed: false,
        subtasks: [],
        lastEdited: Date.now(),
        order: 0,
        parentId: task.id,
        comments: [],
        source: 'manual'
      }], false);
      setIsAdding({ open: false, type: 'child' });
  };

  const handleCopyToClipboard = () => {
    const formatTaskToString = (taskToFormat: Task, level: number): string => {
        const indent = '  '.repeat(level);
        const statusIcon = taskToFormat.status === 'done' ? '[x]' : '[ ]';
        let output = `${indent}- ${statusIcon} ${taskToFormat.text}\n`;
        
        if (taskToFormat.description) {
            const descriptionIndent = '  '.repeat(level + 1);
            output += `${descriptionIndent}${taskToFormat.description.replace(/\n/g, `\n${descriptionIndent}`)}\n`;
        }
        if (taskToFormat.subtasks && taskToFormat.subtasks.length > 0) {
            output += taskToFormat.subtasks.map(subtask => formatTaskToString(subtask, level + 1)).join('');
        }
        return output;
    };
    const textToCopy = formatTaskToString(task, 0);
    navigator.clipboard.writeText(textToCopy).then(() => {
        toast({ title: "Outline copied to clipboard!" });
    }, (err) => {
        toast({ variant: "destructive", title: "Failed to copy", description: "Could not copy text to clipboard." });
    });
  };


  return (
    <div
        className={cn(
            "w-full py-1 hover:bg-accent/10 rounded-md group/task",
            isSelected && "bg-accent/20"
        )}
    >
      <div className="relative flex items-start pr-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
          <div className="flex items-start gap-2 flex-grow">
            <Checkbox
                id={`select-${task.id}`}
                checked={isSelected}
                aria-label={`Select task ${task.text}`}
                className="mt-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => onToggleSelection(task.id, false)}
            />
            
            <div 
              className={cn("w-4 h-4 shrink-0 transition-transform flex items-center justify-center cursor-pointer mt-1", !hasSubtasks && "invisible")}
              onClick={handleToggleCollapse}
            >
              <ChevronRight 
                className={cn("w-4 h-4", !isCollapsed && "rotate-90")} 
              />
            </div>
            
            <div className="flex-grow flex items-start gap-2">
                <div className="flex items-center gap-2 pt-1 shrink-0">
                    {statusSelector}
                </div>

                                {isEditing ? (
                  <Input
                    ref={inputRef}
                    value={editedText}
                    onChange={handleTextChange}
                    onBlur={handleSaveText}
                    onKeyDown={handleTextKeyDown}
                    className="h-8 text-sm flex-grow"
                  />
                ) : (
                  <span 
                    className={cn(
                      'flex-grow whitespace-normal break-words pt-0.5', 
                      task.completed && 'line-through text-muted-foreground',
                      task.description && 'cursor-pointer hover:text-primary/80'
                    )}
                    onDoubleClick={() => setIsEditing(true)}
                    onClick={() => task.description && setIsDescriptionOpen(!isDescriptionOpen)}
                  >
                    <Linkify as="span" options={{ target: '_blank', className: 'text-primary underline hover:text-primary/80' }}>
                      {task.text}
                    </Linkify>
                                        {recentlyChanged?.[task.id] && (
                                            <span className="ml-2 inline-flex items-center">
                                                <Badge className="h-5 flex items-center" variant={recentlyChanged[task.id].kind === 'new' ? 'default' : 'secondary'}>
                                                    {recentlyChanged[task.id].kind === 'new' ? 'New' : 'Updated'}
                                                </Badge>
                                            </span>
                                        )}
                  </span>
                )}
            </div>
          </div>

          <div className="absolute right-2 top-0 h-full flex items-center gap-1 opacity-0 transition-opacity group-hover/task:opacity-100 bg-gradient-to-l from-accent/20 via-accent/10 to-transparent pl-8">
                            <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenSubscopeDialog(task, false)}>
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </Button>
              </TooltipTrigger><TooltipContent><p>Generate sub-scopes</p></TooltipContent></Tooltip>
              
               <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => handleAddClick(e, 'child')}>
                            <PlusCircle className="mr-2 h-4 w-4 text-green-500" />
                            Add sub-scope
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenRephraseDialog(task)}>
                            <Pencil className="mr-2 h-4 w-4 text-cyan-500" />
                            Replace with alternative
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenSubscopeDialog(task, true)}>
                            <RotateCw className="mr-2 h-4 w-4 text-blue-500" />
                            Regenerate sub-scopes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExecuteClick(task)}>
                            <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                            Execute scope
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddCommentClick(task)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Add/View Comment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyToClipboard}>
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copy as Text
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteTask(project.id, task.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
             {hasSubtasks && (
              <span className="text-xs text-muted-foreground ml-auto self-start pt-1 shrink-0 group-hover/task:opacity-0 transition-opacity pointer-events-none">
                ({subtaskCounts.completed}/{subtaskCounts.total})
              </span>
            )}
        </div>
      
        {isDescriptionOpen && task.description && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap pr-2" style={{ paddingLeft: `${(level * 1.5) + 3.25}rem`}}>
            <Linkify as="p" options={{ target: '_blank', className: 'text-primary underline' }}>
              {task.description}
            </Linkify>
          </div>
        )}

      {isAdding.open && (
        <AddSubtaskForm 
          parentId={task.id}
          onAdd={handleAddSubmit}
          onCancel={() => setIsAdding({ open: false, type: 'child' })}
          placeholder={'Enter new sub-scope...'}
        />
      )}

    {!isCollapsed && hasSubtasks && (
        <div className="mt-1">
          {sortedSubtasks.map((subtask) => (
            <TaskNode 
              key={subtask.id}
              task={subtask} 
              level={level + 1}
              allProjects={allProjects}
              project={project} 
              selectedTaskIds={selectedTaskIds}
              onToggleSelection={onToggleSelection}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onAddCommentClick={onAddCommentClick}
              onExecuteClick={onExecuteClick}
              sortOption={sortOption}
              onOpenSubscopeDialog={onOpenSubscopeDialog}
              onOpenRephraseDialog={onOpenRephraseDialog}
          recentlyChanged={recentlyChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
};


const TreeStateProvider = ({ children, tasks }: { children: React.ReactNode, tasks: Task[] }) => {
    const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>(() => {
        const initialCollapsedState: Record<string, boolean> = {};
        const collectIds = (currentTasks: Task[]) => {
            for (const task of currentTasks) {
                if (task.subtasks && task.subtasks.length > 0) {
                    initialCollapsedState[task.id] = true;
                    collectIds(task.subtasks);
                }
            }
        };
        collectIds(tasks);
        return initialCollapsedState;
    });

    const toggleNode = (nodeId: string) => {
      setCollapsedNodes(prev => ({
        ...prev,
        [nodeId]: !prev[nodeId]
      }))
    }

    const setAllNodesCollapsed = (isCollapsed: boolean, tasksToScan: Task[]) => {
      const nodeIds: Record<string, boolean> = {};
      const collectIds = (currentTasks: Task[]) => {
        for (const task of currentTasks) {
          if (task.subtasks && task.subtasks.length > 0) {
            nodeIds[task.id] = isCollapsed;
            collectIds(task.subtasks);
          }
        }
      };
      collectIds(tasksToScan);
      setCollapsedNodes(nodeIds);
    };

    const allNodesCollapsed = tasks.every(task => collapsedNodes[task.id] !== false);

    return (
        <TreeStateContext.Provider value={{ collapsedNodes, toggleNode, setAllNodesCollapsed, allNodesCollapsed }}>
            {children}
        </TreeStateContext.Provider>
    );
}

export function TreeView({ tasks, project, allProjects, selectedTaskIds, onSetSelectedTaskIds, onUpdateProject, onUpdateTaskAndPropagate, onMoveTask, onPromoteSubtask, onAddSubtask, onAddCommentClick, onExecuteClick, onDeleteTask, sortOption, onSetSortOption, onOpenSubscopeDialog, onOpenRephraseDialog, recentlyChanged }: TreeViewProps) {
    const { toast } = useToast();
    const treeState = useContext(TreeStateContext);
    const lastClickedId = useRef<string | null>(null);
    // Legacy generation state removed

    const formatTaskToString = useCallback((taskToFormat: Task, level: number): string => {
        const indent = '  '.repeat(level);
        const statusIcon = taskToFormat.status === 'done' ? '[x]' : '[ ]';
        let output = `${indent}- ${statusIcon} ${taskToFormat.text}\n`;
        
        if (taskToFormat.description) {
            const descriptionIndent = '  '.repeat(level + 1);
            output += `${descriptionIndent}${taskToFormat.description.replace(/\n/g, `\n${descriptionIndent}`)}\n`;
        }
        if (taskToFormat.subtasks && taskToFormat.subtasks.length > 0) {
            output += taskToFormat.subtasks.map(subtask => formatTaskToString(subtask, level + 1)).join('');
        }
        return output;
    }, []);

    const handleUpdateTask = useCallback((updatedTask: Task) => {
        onUpdateTaskAndPropagate(project.id, updatedTask);
    }, [project.id, onUpdateTaskAndPropagate]);

    const handleDeleteTask = useCallback((projectId: string, taskId: string) => {
        onDeleteTask(projectId, taskId)
        onSetSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId)); // Deselect if deleted
    }, [onDeleteTask, onSetSelectedTaskIds, selectedTaskIds]);
    
    const handleDeleteSelected = () => {
        if(project.id && selectedTaskIds.length > 0) {
             selectedTaskIds.forEach(id => onDeleteTask(project.id, id));
             toast({ title: `${selectedTaskIds.length} scope(s) deleted`, variant: 'default' });
             onSetSelectedTaskIds([]);
        }
    };

    // Legacy inline JSON-to-Task conversion removed; unified dialog handles generation paths.
  
    // Legacy direct AI generation callback removed; unified dialog handles generation.

    const handleAddSubtaskCallback = useCallback((anchorTaskId: string, subtasks: Task[], isSibling: boolean) => {
        onAddSubtask(project.id, anchorTaskId, subtasks, isSibling);
    }, [project.id, onAddSubtask]);
    
    // Legacy regenerate task callback removed

    const handleToggleAll = () => {
        if (treeState) {
            treeState.setAllNodesCollapsed(!treeState.allNodesCollapsed, tasks);
        }
    };
    
    const allCollapsed = treeState?.allNodesCollapsed ?? true;

    const handleToggleSelection = (taskId: string, isShiftClick: boolean) => {
        const flatTaskIds: string[] = [];
        const collectIds = (tasks: Task[]) => {
            tasks.forEach(t => {
                flatTaskIds.push(t.id);
                if (t.subtasks) collectIds(t.subtasks);
            })
        }
        collectIds(sortedTasks);
        
        let newSelection = [...selectedTaskIds];

        if (isShiftClick && lastClickedId.current) {
            const lastIndex = flatTaskIds.indexOf(lastClickedId.current);
            const currentIndex = flatTaskIds.indexOf(taskId);
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = flatTaskIds.slice(start, end + 1);
            
            // Determine if we are selecting or deselecting
            const isSelecting = !newSelection.includes(taskId);
            if (isSelecting) {
                rangeIds.forEach(id => {
                    if (!newSelection.includes(id)) newSelection.push(id);
                });
            } else {
                newSelection = newSelection.filter(id => !rangeIds.includes(id));
            }
        } else {
            if (newSelection.includes(taskId)) {
                newSelection = newSelection.filter(id => id !== taskId);
            } else {
                newSelection.push(taskId);
            }
        }

        onSetSelectedTaskIds(newSelection);
        lastClickedId.current = taskId;
    };


    const handleSortKeyChange = (key: SortOption['key']) => {
        onSetSortOption({ ...sortOption, key });
    };
    
    const handleSortDirectionChange = (direction: SortOption['direction']) => {
        onSetSortOption({ ...sortOption, direction });
    };

    const sortOptionsMap: Record<SortOption['key'], string> = {
        'edit-date': 'Last Edited Date',
        name: 'Alphabetical',
        completion: 'Completion Status',
        complexity: 'Complexity',
    };
    
    // Only sort the highest-level scopes in the main page
    const sortedTasks = sortTasksShallow(tasks, sortOption);
    
    const allTaskIds = useMemo(() => {
        const ids: string[] = [];
        const collect = (tasksToScan: Task[]) => {
            for (const t of tasksToScan) {
                ids.push(t.id);
                if (t.subtasks) collect(t.subtasks);
            }
        };
        collect(tasks);
        return ids;
    }, [tasks]);

    const areAllSelected = allTaskIds.length > 0 && allTaskIds.every(id => selectedTaskIds.includes(id));

    const handleSelectAllToggle = () => {
        if (areAllSelected) {
            onSetSelectedTaskIds([]);
        } else {
            onSetSelectedTaskIds(allTaskIds);
        }
    };
    
    const selectedTasks = useMemo(() => {
        const selected: Task[] = [];
        const findSelected = (tasksToScan: Task[]) => {
            for (const task of tasksToScan) {
                if (selectedTaskIds.includes(task.id)) {
                    selected.push(task);
                }
                if (task.subtasks) {
                    findSelected(task.subtasks);
                }
            }
        };
        findSelected(tasks);
        return selected;
    }, [tasks, selectedTaskIds]);
    
    const canMoveSelected = useMemo(() => {
        if (selectedTasks.length === 0) return false;
        // This logic seems flawed for deeply nested structures.
        // A better approach is to check if all selected items share the same parentId.
        const parentIds = new Set(selectedTasks.map(t => t.parentId));
        return parentIds.size === 1;
    }, [selectedTasks]);

    const handleMoveSelected = (targetProjectId: string) => {
        if (!canMoveSelected) {
            toast({
                variant: 'destructive',
                title: 'Cannot Move Scopes',
                description: 'You can only move scopes that are on the same level.'
            });
            return;
        }
        selectedTasks.forEach(task => {
            onMoveTask(task.id, project.id, targetProjectId);
        });
        onSetSelectedTaskIds([]);
    };
    
    // Old in-component generation dialog removed in favor of unified dialog from the page component.

    return (
        <TooltipProvider>
            <div className="p-4 bg-card rounded-lg border">
            <div className="flex justify-between items-center mb-2 gap-2">
                 <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-between">
                                <span>Sort: {sortOptionsMap[sortOption.key]}</span>
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Sort Scopes By</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortOption.key} onValueChange={(val) => handleSortKeyChange(val as SortOption['key'])}>
                            {Object.entries(sortOptionsMap).map(([key, label]) => (
                                <DropdownMenuRadioItem key={key} value={key}>{label}</DropdownMenuRadioItem>
                            ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSortDirectionChange(sortOption.direction === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOption.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAllToggle} title={areAllSelected ? "Deselect All" : "Select All"}>
                        {areAllSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                        {areAllSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleToggleAll} title={allCollapsed ? "Expand All" : "Collapse All"}>
                    {allCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />} 
                    {allCollapsed ? 'Expand All' : 'Collapse All'}
                    </Button>
                </div>
            </div>

            {selectedTaskIds.length > 0 && (
                <div className="bg-accent/20 border border-accent/50 rounded-lg p-2 mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{selectedTaskIds.length} scope(s) selected</p>
                    <div className="flex items-center gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Actions</Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                    const text = selectedTasks.map(t => formatTaskToString(t, 0)).join('\n');
                                    navigator.clipboard.writeText(text);
                                    toast({title: 'Copied selected outlines!'});
                                }}>
                                    <ClipboardCopy className="mr-2"/>
                                    Copy Outline
                                </DropdownMenuItem>
                                
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Wand2 className="mr-2"/>
                                        Generate
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => onExecuteClick(selectedTasks[0])} disabled={selectedTasks.length !== 1}>
                                                <Zap className="mr-2 text-yellow-500" />
                                                Execute
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onOpenRephraseDialog && onOpenRephraseDialog(selectedTasks[0])} disabled={selectedTasks.length !== 1}>
                                                <Pencil className="mr-2 text-cyan-500" />
                                                Replace with alternative
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onOpenSubscopeDialog && onOpenSubscopeDialog(selectedTasks[0], false)} disabled={selectedTasks.length !== 1}>
                                                <BrainCircuit className="mr-2 text-primary" />
                                                Generate sub-scopes
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onOpenSubscopeDialog && onOpenSubscopeDialog(selectedTasks[0], true)} disabled={selectedTasks.length !== 1}>
                                                <RotateCw className="mr-2 text-blue-500" />
                                                Regenerate sub-scopes
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger disabled={!canMoveSelected}>
                                        <FolderSymlink className="mr-2"/>
                                        Move to
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            {allProjects.filter(p => p.id !== project.id).map(p => (
                                                <DropdownMenuItem key={p.id} onClick={() => handleMoveSelected(p.id)}>
                                                    {p.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={handleDeleteSelected}>
                                    <Trash2 className="mr-2"/>
                                    Delete Selected
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )}
            
            <div className="space-y-1">
                {sortedTasks.map((task) => (
                    <TaskNode 
                        key={task.id}
                        task={task} 
                        level={0}
                        allProjects={allProjects}
                        project={project}
                        selectedTaskIds={selectedTaskIds}
                        onToggleSelection={handleToggleSelection}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        onAddSubtask={handleAddSubtaskCallback}
                        onAddCommentClick={onAddCommentClick}
                        onExecuteClick={onExecuteClick}
                        onOpenSubscopeDialog={onOpenSubscopeDialog}
                        onOpenRephraseDialog={onOpenRephraseDialog}
                        sortOption={sortOption}
                        recentlyChanged={recentlyChanged}
                    />
                ))}
            </div>
            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                    <p className="font-semibold">This folder is empty.</p>
                    <p className="text-sm">Use the input above to add a new scope.</p>
                </div>
            )}
            {/* Legacy generation dialog removed; unified dialog is controlled by the page component. */}
            </div>
        </TooltipProvider>
  );
}

// Wrapper component to provide the TreeStateContext
export function TreeViewWrapper(props: TreeViewProps) {
  return (
    <TreeStateProvider tasks={props.tasks}>
      <TreeView {...props} />
    </TreeStateProvider>
  );
}
