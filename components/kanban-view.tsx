
'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, TaskStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


type KanbanViewProps = {
  project: Project;
  activeTask: Task | null;
  onUpdateTaskAndPropagate: (projectId: string, task: Task) => void;
  onItemSelect: (selection: { projectId: string; taskId: string | null }) => void;
};

const statusMap: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
};

const statusColors: Record<TaskStatus, string> = {
    todo: 'bg-gray-500',
    inprogress: 'bg-blue-500',
    done: 'bg-green-500',
};

export function KanbanView({ project, activeTask, onUpdateTaskAndPropagate, onItemSelect }: KanbanViewProps) {
  const tasksToDisplay = useMemo(() => {
    if (activeTask) {
        return activeTask.subtasks || [];
    }
    return project.tasks;
  }, [activeTask, project.tasks]);
  
  const getTasksByStatus = (status: TaskStatus) => {
    return tasksToDisplay.filter(t => t.status === status);
  }

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    onUpdateTaskAndPropagate(project.id, { ...task, status: newStatus });
  };
  
  const columnsToShow = Object.keys(statusMap) as TaskStatus[];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columnsToShow.map(status => (
              <Card key={status} className='bg-secondary/50'>
                  <CardHeader>
                      <CardTitle>{statusMap[status]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-h-[200px]">
                      {getTasksByStatus(status).map((task) => {
                          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                          const statusSelector = (
                            <Select 
                                value={task.status} 
                                onValueChange={(newStatus: TaskStatus) => handleStatusChange(task, newStatus)}
                                disabled={hasSubtasks}
                            >
                                <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[task.status]}`} />
                                            <span>{statusMap[task.status]}</span>
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(statusMap) as TaskStatus[]).map(s => (
                                        <SelectItem key={s} value={s} className="text-xs">
                                          <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s]}`} />
                                                {statusMap[s]}
                                          </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                          );
                          
                          return (
                            <div
                                key={task.id}
                                className='p-4 rounded-lg bg-card shadow'
                            >
                                <p 
                                  className="cursor-pointer hover:text-primary mb-2"
                                  onClick={() => onItemSelect({ projectId: project.id, taskId: task.id })}
                                >
                                  {task.text}
                                </p>
                                {hasSubtasks ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {/* Wrap in a div because disabled elements don't trigger events */}
                                            <div className="w-full">{statusSelector}</div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Edit sub-scopes to change status</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    statusSelector
                                )}
                            </div>
                          )
                      })}
                       {getTasksByStatus(status).length === 0 && (
                          <div className="text-center text-muted-foreground pt-8">
                              No scopes in this stage.
                          </div>
                      )}
                  </CardContent>
              </Card>
          ))}
      </div>
    </div>
  );
}

