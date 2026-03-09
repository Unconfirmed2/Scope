
'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Project, Task, TaskStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from './ui/badge';
import { GripVertical } from 'lucide-react';


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
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const tasksToDisplay = useMemo(() => {
    if (activeTask) {
        return activeTask.subtasks || [];
    }
    return project.tasks;
  }, [activeTask, project.tasks]);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasksToDisplay.filter(t => t.status === status);
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    onUpdateTaskAndPropagate(project.id, { ...task, status: newStatus });
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasksToDisplay.find(t => t.id === taskId);
    if (task && task.status !== newStatus && !(task.subtasks && task.subtasks.length > 0)) {
      handleStatusChange(task, newStatus);
    }
  }, [tasksToDisplay, handleStatusChange]);

  const handleDragEnd = useCallback(() => {
    setDragOverColumn(null);
    setDraggingTaskId(null);
  }, []);

  const columnsToShow = Object.keys(statusMap) as TaskStatus[];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columnsToShow.map(status => {
              const columnTasks = getTasksByStatus(status);
              return (
                <Card
                  key={status}
                  className={cn(
                    'bg-secondary/50 transition-colors',
                    dragOverColumn === status && 'ring-2 ring-primary/50 bg-primary/5'
                  )}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle>{statusMap[status]}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[200px]">
                      {columnTasks.map((task) => {
                          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                          const isDragging = draggingTaskId === task.id;
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
                                draggable={!hasSubtasks}
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  'p-4 rounded-lg bg-card shadow transition-opacity',
                                  !hasSubtasks && 'cursor-grab active:cursor-grabbing',
                                  isDragging && 'opacity-50'
                                )}
                            >
                                <div className="flex items-start gap-2">
                                  {!hasSubtasks && (
                                    <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
                                  )}
                                  <p
                                    className="cursor-pointer hover:text-primary mb-2 flex-grow"
                                    onClick={() => onItemSelect({ projectId: project.id, taskId: task.id })}
                                  >
                                    {task.text}
                                  </p>
                                </div>
                                {hasSubtasks ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
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
                       {columnTasks.length === 0 && (
                          <div className="text-center text-muted-foreground pt-8 border-2 border-dashed rounded-lg py-8">
                              {dragOverColumn === status ? 'Drop here' : 'No scopes in this stage.'}
                          </div>
                      )}
                  </CardContent>
              </Card>
              );
          })}
      </div>
    </div>
  );
}
