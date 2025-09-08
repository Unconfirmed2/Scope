
'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Project, Task, SortOption, SortKey } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Lock, ChevronRight, MoreHorizontal, Trash2, FolderSymlink, ArrowUpRightSquare, Pin, PinOff, Pencil, ArrowDown, ArrowUp, Download, ChevronsRight, ChevronsLeft } from 'lucide-react';
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from './ui/progress';
import { calculateProjectProgress, countDirectSubtasks, sortTasksShallow, findTaskRecursive } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

const calculateTaskProgress = (task: Task): number => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.status === 'done' ? 100 : 0;
    }
    const { completed, total } = countDirectSubtasks(task.subtasks);
    return total > 0 ? (completed / total) * 100 : 0;
}


type SidebarProps = {
  isOpen: boolean;
  onSetIsOpen: (isOpen: boolean) => void;
  width: number;
  projects: Project[];
  activeProjectId: string | null;
  activeTaskId: string | null;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
  onItemSelect: (selection: { projectId: string; taskId: string | null }) => void;
  onCreateProject: (name: string) => void;
  onCreateTask: (projectId: string, taskName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onMoveTask: (taskId: string, sourceProjectId: string, targetProjectId: string) => void;
  onPromoteSubtask: (projectId: string, taskId: string) => void;
  onExportProject: (project: Project) => void;
};

const SidebarTask = ({ 
  task,
  project,
  allProjects,
  level,
  activeTaskId,
  onItemSelect,
  onMoveTask,
  onDeleteTask,
  onPromoteSubtask,
  collapsedTasks,
  toggleTaskCollapse,
  onUpdateTask,
  editingTaskId,
  setEditingTaskId
}: {
  task: Task,
  project: Project,
  allProjects: Project[],
  level: number,
  activeTaskId: string | null,
  onItemSelect: (selection: { projectId: string; taskId: string | null }) => void;
  onMoveTask: (taskId: string, sourceProjectId: string, targetProjectId: string) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onPromoteSubtask: (projectId: string, taskId: string) => void;
  collapsedTasks: Record<string, boolean>;
  toggleTaskCollapse: (taskId: string) => void;
  onUpdateTask: (updatedTask: Task) => void;
  editingTaskId: string | null;
  setEditingTaskId: (taskId: string | null) => void;
}) => {
  const isTaskActive = task.id === activeTaskId;
  const taskProgress = calculateTaskProgress(task);
  const isCollapsed = collapsedTasks[task.id] ?? true;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const subtaskCounts = hasSubtasks ? countDirectSubtasks(task.subtasks) : { completed: 0, total: 0 };
  const isEditing = editingTaskId === task.id;

  const handleRename = (newName: string) => {
    if (newName.trim() && newName !== task.text) {
      onUpdateTask({ ...task, text: newName.trim() });
    }
    setEditingTaskId(null);
  };

  return (
    <div style={{ paddingLeft: `${level * 0.5}rem`}}>
      <div
          className={cn(
              "flex items-center gap-2 text-sm group/task cursor-pointer hover:bg-accent/10 rounded p-1 pr-2 flex-col",
          )}
        >
          <div className={cn("flex items-center w-full", isTaskActive && !isEditing && "bg-accent/20 rounded-md")}
            onClick={(e) => {
              if (isEditing) return;
              e.stopPropagation();
              onItemSelect({ projectId: project.id, taskId: task.id })
            }}
          >
            <ChevronRight 
              className={cn("h-4 w-4 shrink-0 transition-transform cursor-pointer", 
                !hasSubtasks && 'invisible',
                !isCollapsed && "rotate-90"
              )} 
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskCollapse(task.id);
              }}
            />
            
            {isEditing ? (
              <Input 
                defaultValue={task.text}
                autoFocus
                onBlur={(e) => handleRename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(e.currentTarget.value);
                  if (e.key === 'Escape') setEditingTaskId(null);
                }}
                className="h-7 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn('truncate flex-grow', isTaskActive && "font-semibold", task.completed && "line-through text-muted-foreground")}>{task.text}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                  <p>{task.text}</p>
                </TooltipContent>
              </Tooltip>
            )}

            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/task:opacity-100 ml-auto" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
                  <DropdownMenuItem onClick={() => setEditingTaskId(task.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                  </DropdownMenuItem>
                  {level === 0 ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderSymlink className="mr-2 h-4 w-4" />
                        Move to
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {allProjects.filter(p => p.id !== project.id).map(p => (
                          <DropdownMenuItem key={p.id} onClick={() => onMoveTask(task.id, project.id, p.id)}>
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem onClick={() => onPromoteSubtask(project.id, task.id)}>
                      <ArrowUpRightSquare className="mr-2 h-4 w-4" />
                      Make top-level scope
                    </DropdownMenuItem>
                  )}

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDeleteTask(project.id, task.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Scope
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
           {hasSubtasks && (
             <div className="w-full flex items-center gap-2 pl-5 pr-2">
                <Progress value={taskProgress} className="h-1 flex-grow" />
                <span className="text-xs text-muted-foreground shrink-0">{subtaskCounts.completed}/{subtaskCounts.total}</span>
            </div>
          )}
      </div>
      {!isCollapsed && hasSubtasks && (
         <div className="space-y-1 mt-1">
          {task.subtasks.map(subtask => (
             <SidebarTask
                  key={subtask.id}
                  task={subtask}
                  project={project}
                  allProjects={allProjects}
                  level={level + 1}
                  activeTaskId={activeTaskId}
                  onItemSelect={onItemSelect}
                  onMoveTask={onMoveTask}
                  onDeleteTask={onDeleteTask}
                  onPromoteSubtask={onPromoteSubtask}
                  collapsedTasks={collapsedTasks}
                  toggleTaskCollapse={toggleTaskCollapse}
                  onUpdateTask={onUpdateTask}
                  editingTaskId={editingTaskId}
                  setEditingTaskId={setEditingTaskId}
              />
          ))}
         </div>
      )}
    </div>
  );
};


export function Sidebar({ 
  isOpen, onSetIsOpen, width, projects, activeProjectId, activeTaskId, sortOption, onSetSortOption, onItemSelect, onCreateProject, onCreateTask, onDeleteProject, onUpdateProject, onDeleteTask, onMoveTask, onPromoteSubtask, onExportProject
}: SidebarProps) {
  const { user: _user, logOut: _logOut } = useAuth();
  const [newTaskName, setNewTaskName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    projects.forEach(p => {
      initialState[p.id] = true; // Start with all folders collapsed
    });
    return initialState;
  });
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProjectId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingProjectId])

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      onCreateTask('unassigned', newTaskName.trim());
      setNewTaskName('');
      // Expand unassigned folder if it's collapsed
      setCollapsedProjects(prev => ({...prev, 'unassigned': false}));
    }
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
        onCreateProject(newProjectName.trim());
        setNewProjectName('');
        setIsAddingProject(false);
    }
  };
  
  const toggleProjectCollapse = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setCollapsedProjects(prev => ({...prev, [projectId]: !prev[projectId]}));
  };

  const toggleAllProjects = () => {
    const isAnyProjectOpen = Object.values(collapsedProjects).some(isCollapsed => !isCollapsed);
    const newState: Record<string, boolean> = {};
    projects.forEach(p => {
      newState[p.id] = isAnyProjectOpen; // If any is open, collapse all. Otherwise, expand all.
    });
    setCollapsedProjects(newState);
  };
  
  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks(prev => ({...prev, [taskId]: !prev[taskId]}));
  };
  
  const allProjectsCollapsed = projects.every(p => collapsedProjects[p.id]);

  const handleProjectRename = (project: Project, newName: string) => {
    if (newName.trim() && newName.trim() !== project.name) {
      onUpdateProject({ ...project, name: newName.trim() });
    }
    setEditingProjectId(null);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    // A bit of a prop drill, but we need to find the folder this scope belongs to
    const project = projects.find(p => findTaskRecursive(p.tasks, updatedTask.id));
    if(project) {
        // This is a simplified update. A more robust implementation would use a dedicated update function
        // similar to the one in useProjects. For renaming, this is okay.
        const updateInTree = (tasks: Task[]): Task[] => {
            return tasks.map(t => {
                if (t.id === updatedTask.id) return updatedTask;
                if (t.subtasks) return { ...t, subtasks: updateInTree(t.subtasks) };
                return t;
            })
        }
        onUpdateProject({ ...project, tasks: updateInTree(project.tasks) });
    }
  }

  const handleSortKeyChange = (key: SortKey) => {
    onSetSortOption({ ...sortOption, key });
  };
  
  const handleSortDirectionChange = (direction: SortOption['direction']) => {
    onSetSortOption({ ...sortOption, direction });
  };

  const projectSortOptionsMap: Record<SortKey, string> = {
    name: 'Alphabetical',
    completion: 'Completion Status',
    complexity: 'Complexity',
    'edit-date': 'Last Edited Date',
};

  if (!isOpen) {
    return (
        <div 
            onClick={() => onSetIsOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40"
        >
            <div className="bg-secondary p-2 rounded-r-lg shadow-lg cursor-pointer hover:bg-accent/80">
                <ChevronsRight className="h-6 w-6 text-secondary-foreground" />
            </div>
        </div>
    )
  }

  return (
    <aside className={cn(
      "flex flex-col h-full bg-secondary text-secondary-foreground transition-all duration-300 ease-in-out",
      isOpen ? "p-2" : "p-0",
      "overflow-hidden"
    )} style={{width: isOpen ? width : 0}}>
      <TooltipProvider>
      <div className="p-2 border-b">
         <div className="flex justify-between items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsAddingProject(!isAddingProject)} title="Create New Folder">
              <Plus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleAllProjects} title={allProjectsCollapsed ? "Expand All" : "Collapse All"}>
              {allProjectsCollapsed ? <ChevronsRight className="h-4 w-4 mr-1" /> : <ChevronsLeft className="h-4 w-4 mr-1" />}
              <span>{allProjectsCollapsed ? "Expand" : "Collapse"}</span>
            </Button>
        </div>
         <div className="mt-2 flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-grow justify-between">
                  <span>Sort: {projectSortOptionsMap[sortOption.key] || 'Alphabetical'}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort Folders By</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOption.key} onValueChange={(val) => handleSortKeyChange(val as SortOption['key'])}>
                  {Object.entries(projectSortOptionsMap).map(([key, label]) => (
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
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 py-2">
        {isAddingProject && (
          <div className="p-2 flex gap-2 items-center">
            <Input 
              placeholder="New folder name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateProject}>Save</Button>
          </div>
        )}
        {projects.map((project) => {
          const isUnassigned = project.id === 'unassigned';
          const isCollapsed = collapsedProjects[project.id] ?? true;
          const progress = calculateProjectProgress(project.tasks);
          const taskCounts = countDirectSubtasks(project.tasks);
          // Only sort top-level scopes; preserve child order from JSON
          const sortedTasks = sortTasksShallow(project.tasks, sortOption);
          const isProjectActive = project.id === activeProjectId && !activeTaskId;
          const isEditing = editingProjectId === project.id;

          return (
            <div key={project.id} className="rounded-md bg-transparent group/project">
              <div
                onClick={() => !isEditing && onItemSelect({ projectId: project.id, taskId: null })}
                className={cn(
                  "flex flex-col group p-2 rounded-md hover:bg-accent/20 cursor-pointer",
                   isProjectActive && !isEditing && "bg-background/50"
                )}
              >
                <div className="flex items-center w-full">
                  <ChevronRight 
                    className={cn("h-4 w-4 mr-1 shrink-0 transition-transform cursor-pointer", !isCollapsed && "rotate-90")} 
                    onClick={(e) => toggleProjectCollapse(e, project.id)}
                  />
                  
                  {isEditing ? (
                    <Input 
                      ref={inputRef}
                      defaultValue={project.name}
                      onBlur={(e) => handleProjectRename(project, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleProjectRename(project, e.currentTarget.value);
                        if (e.key === 'Escape') setEditingProjectId(null);
                      }}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-grow text-left truncate">
                            <p className="flex items-center gap-2">
                                {project.pinned && <Pin className="h-3 w-3 text-amber-500"/>}
                                {isUnassigned ? <Lock className="h-3 w-3 text-muted-foreground"/> : null}
                                {project.name}
                            </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start">
                        <p>{project.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                 
                  <div className="ml-auto flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/project:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
                          {!isUnassigned && (
                            <>
                              <DropdownMenuItem onClick={() => onUpdateProject({...project, pinned: !project.pinned})}>
                                {project.pinned ? <PinOff className="mr-2 h-4 w-4"/> : <Pin className="mr-2 h-4 w-4" />}
                                {project.pinned ? 'Unpin' : 'Pin'} Folder
                              </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => setEditingProjectId(project.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onExportProject(project)}>
                                <Download className="mr-2 h-4 w-4" />
                                Export as Zip
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(project.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Folder
                              </DropdownMenuItem>
                            </>
                          )}
                           {isUnassigned && (
                              <DropdownMenuItem disabled>
                                <p className="text-xs text-muted-foreground">The Unassigned folder cannot be modified.</p>
                              </DropdownMenuItem>
                           )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </div>

                 <div className="w-full pl-5 pr-2 mt-1">
                      <Progress value={progress} className="h-1" />
                      <span className="text-xs text-muted-foreground">{taskCounts.completed}/{taskCounts.total} scopes</span>
                  </div>
              </div>
              {!isCollapsed && (
                <div className="pl-2 pr-2 py-1 space-y-1 min-h-[10px]">
                  {sortedTasks.map((task) => (
                    <SidebarTask
                      key={task.id}
                      task={task}
                      project={project}
                      allProjects={projects}
                      level={0}
                      activeTaskId={activeTaskId}
                      onItemSelect={onItemSelect}
                      onMoveTask={onMoveTask}
                      onDeleteTask={onDeleteTask}
                      onPromoteSubtask={onPromoteSubtask}
                      collapsedTasks={collapsedTasks}
                      toggleTaskCollapse={toggleTaskCollapse}
                      onUpdateTask={handleUpdateTask}
                      editingTaskId={editingTaskId}
                      setEditingTaskId={setEditingTaskId}
                    />
                  ))}
                  {sortedTasks.length === 0 && (
                      <div className="text-xs text-muted-foreground p-1 pl-4">No scopes yet.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="p-2 border-t">
        <form onSubmit={handleCreateTask} className="flex gap-2">
          <Input
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="New scope in Unassigned..."
            className="bg-background text-foreground"
          />
          <Button type="submit" size="icon" variant="outline">
            <Plus />
          </Button>
        </form>
      </div>
      </TooltipProvider>
    </aside>
  );
}
