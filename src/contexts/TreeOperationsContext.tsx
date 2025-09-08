'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Task } from '@/lib/types';

// Define the tree operations interface
export interface TreeOperations {
  onUpdateTaskAndPropagate: (projectId: string, task: Task) => void;
  onMoveTask: (taskId: string, sourceProjectId: string, targetProjectId: string) => void;
  onPromoteSubtask: (projectId: string, taskId: string) => void;
  onAddSubtask: (projectId: string, parentId: string, subtasks: Task[], isSibling: boolean) => void;
  onAddCommentClick: (task: Task) => void;
  onExecuteClick: (task: Task) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onOpenSubscopeDialog: (task: Task, isRegeneration: boolean) => void;
  onOpenRephraseDialog: (task: Task) => void;
}

const TreeOperationsContext = createContext<TreeOperations | null>(null);

interface TreeOperationsProviderProps {
  children: ReactNode;
  operations: TreeOperations;
}

export function TreeOperationsProvider({ children, operations }: TreeOperationsProviderProps) {
  return (
    <TreeOperationsContext.Provider value={operations}>
      {children}
    </TreeOperationsContext.Provider>
  );
}

export function useTreeOperations(): TreeOperations {
  const context = useContext(TreeOperationsContext);
  if (!context) {
    throw new Error('useTreeOperations must be used within a TreeOperationsProvider');
  }
  return context;
}

// Optional hook that returns null if not within provider (for gradual migration)
export function useTreeOperationsOptional(): TreeOperations | null {
  return useContext(TreeOperationsContext);
}