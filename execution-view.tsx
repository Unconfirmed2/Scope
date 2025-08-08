'use client';

import React, { useMemo } from 'react';
import type { Project, Task, ExecutionResult } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Linkify from 'linkify-react';
import { findTaskPath } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronRight, Zap } from 'lucide-react';

type ExecutionWithContext = {
  result: ExecutionResult;
  task: Task;
  path: Task[];
};

type ExecutionViewProps = {
  project: Project;
  activeTask: Task | null;
  onItemSelect: (taskId: string) => void;
};

const ExecutionBreadcrumb = ({ path, onSelectTask }: { path: Task[], onSelectTask: (taskId: string) => void }) => {
    return (
        <div className="flex items-center text-xs text-muted-foreground mb-1">
            {path.map((task, index) => (
                <div key={task.id} className="flex items-center">
                    <button onClick={() => onSelectTask(task.id)} className="hover:underline truncate max-w-[150px]">{task.text}</button>
                    {index < path.length - 1 && <ChevronRight className="h-3 w-3 mx-1 shrink-0" />}
                </div>
            ))}
        </div>
    )
};

export function ExecutionView({ project, activeTask, onItemSelect }: ExecutionViewProps) {
  
  const allExecutionsWithContext: ExecutionWithContext[] = useMemo(() => {
    const executions: ExecutionWithContext[] = [];
    const findExecutionsRecursive = (tasks: Task[]) => {
      for (const task of tasks) {
        if (task.executionResults && task.executionResults.length > 0) {
          const path = findTaskPath(project.tasks, task.id);
          for (const result of task.executionResults) {
            executions.push({ result, task, path });
          }
        }
        if (task.subtasks) {
          findExecutionsRecursive(task.subtasks);
        }
      }
    };
    findExecutionsRecursive(project.tasks);
    // Sort by most recent execution first
    return executions.sort((a, b) => b.result.timestamp - a.result.timestamp);
  }, [project.tasks]);

  const executionsToDisplay = activeTask 
    ? allExecutionsWithContext.filter(e => e.path.some(p => p.id === activeTask.id))
    : allExecutionsWithContext;

  return (
    <div className="p-4 bg-card rounded-lg border max-w-4xl mx-auto">
      <h3 className="font-semibold text-lg mb-4">Execution Results for "{activeTask?.text || project.name}"</h3>
      
      {executionsToDisplay.length > 0 ? (
        <Accordion type="single" collapsible className="w-full" defaultValue={executionsToDisplay[0].task.id + executionsToDisplay[0].result.timestamp}>
          {executionsToDisplay.map(({ result, task, path }) => (
            <AccordionItem key={task.id + result.timestamp} value={task.id + result.timestamp}>
              <AccordionTrigger>
                <div className="flex flex-col text-left">
                    {!activeTask && <ExecutionBreadcrumb path={path} onSelectTask={onItemSelect} />}
                    <span>Execution from {format(new Date(result.timestamp), 'MMM d, yyyy - h:mm a')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-md bg-background/50">
                    <Linkify as="div" options={{ target: '_blank', className: 'text-primary underline' }}>
                        {result.resultText.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                                {line}
                                <br />
                            </React.Fragment>
                        ))}
                    </Linkify>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center text-muted-foreground mt-8 border-2 border-dashed rounded-lg p-12">
            <Zap className="mx-auto h-12 w-12 text-yellow-400 mb-4"/>
            <h3 className='text-xl font-semibold mb-2'>No Execution Results</h3>
            <p>Use the "Execute" action on a scope in the List View to see AI-generated results here.</p>
        </div>
      )}
    </div>
  );
}

