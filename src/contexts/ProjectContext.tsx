'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Project, Task } from '@/lib/types';

// Define the project state and operations interface
export interface ProjectContextType {
  // Current state
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | null;
  activeTask: Task | null;
  activeTaskId: string | null;
  selectedTaskIds: string[];
  breadcrumbPath: Task[];
  
  // Recently changed tracking
  recentlyChanged: Record<string, { kind: 'new' | 'updated'; at: number }>;
  setRecentlyChanged: (update: ((prev: Record<string, { kind: 'new' | 'updated'; at: number }>) => Record<string, { kind: 'new' | 'updated'; at: number }>)) => void;
  
  // Navigation operations
  setActiveItem: (item: { projectId: string; taskId: string | null }) => void;
  setSelectedTaskIds: (ids: string[]) => void;
  
  // Project operations
  updateProject: (project: Project) => void;
  createProject: (name: string) => string | null;
  deleteProject: (projectId: string) => boolean;
  
  // Task operations
  createTaskInProject: (projectId: string, taskName: string) => string | null;
  updateTaskAndPropagateStatus: (projectId: string, task: Task) => void;
  deleteTask: (projectId: string, taskId: string) => boolean;
  moveTaskToProject: (taskId: string, sourceProjectId: string, targetProjectId: string) => boolean;
  promoteSubtaskToTask: (projectId: string, taskId: string) => boolean;
  addSubtask: (projectId: string, anchorTaskId: string, newSubtasks: Task[], isSibling: boolean) => boolean;
  
  // Comment operations
  addCommentToTask: (projectId: string, taskId: string, commentText: string) => boolean;
  
  // Execution operations
  executeTask: (projectId: string, taskId: string, taskText: string, userInput?: string, projectName?: string, otherTasks?: string[]) => Promise<boolean>;
  
  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
  value: ProjectContextType;
}

export function ProjectProvider({ children, value }: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Optional hook that returns null if not within provider (for gradual migration)
export function useProjectOptional(): ProjectContextType | null {
  return useContext(ProjectContext);
}