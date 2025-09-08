'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Task, Project } from '@/lib/types';

interface BreadcrumbNavProps {
  activeProject: Project;
  breadcrumbPath: Task[];
  onNavigateToProject: () => void;
  onNavigateToTask: (projectId: string, taskId: string) => void;
  className?: string;
}

export function BreadcrumbNav({
  activeProject,
  breadcrumbPath,
  onNavigateToProject,
  onNavigateToTask,
  className = ''
}: BreadcrumbNavProps) {
  if (!activeProject) return null;

  return (
    <div className={`flex items-center text-sm text-muted-foreground mb-4 flex-wrap ${className}`}>
      {/* Project root button */}
      <button 
        className="hover:underline" 
        onClick={onNavigateToProject}
      >
        {activeProject.name}
      </button>

      {/* Breadcrumb path */}
      {breadcrumbPath.map((task, index) => (
        <div key={task.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          
          {index < breadcrumbPath.length - 1 ? (
            // Clickable breadcrumb item
            <button 
              className="hover:underline"
              onClick={() => onNavigateToTask(activeProject.id, task.id)}
            >
              {task.text}
            </button>
          ) : (
            // Current/active breadcrumb item (not clickable)
            <span className="font-semibold text-foreground truncate">
              {task.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}