
'use client';

import type { Project, Task, TaskStatus } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { GitCommitHorizontal, GitCommitVertical, ZoomIn, ZoomOut } from 'lucide-react';

type MindMapProps = {
    project: Project;
    activeTask: Task | null;
    onItemSelect: (taskId: string | null) => void;
};

const statusColors: Record<TaskStatus, string> = {
    todo: 'border-gray-400 bg-gray-100 dark:bg-gray-800',
    inprogress: 'border-blue-500 bg-blue-100 dark:bg-blue-900',
    done: 'border-green-500 bg-green-100 dark:bg-green-900',
};

const MindMapNode = ({ 
    task, 
    onNodeClick, 
    layout,
    level
}: { 
    task: Task, 
    onNodeClick: (taskId: string) => void,
    layout: 'vertical' | 'horizontal',
    level: number
}) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    
    const nodeContent = (
      <div 
        onClick={() => onNodeClick(task.id)}
        className={cn(
            "p-3 rounded-lg border-2 shadow-md cursor-pointer hover:shadow-xl hover:scale-105 transition-all text-center",
            "max-w-xs", // Set a max-width for nodes
            statusColors[task.status],
            level === 0 && 'font-bold text-lg p-4'
        )}
        >
        <p className="line-clamp-2 break-words">{task.text}</p>
      </div>
    );

    const containerClasses = cn("flex items-center justify-center", {
        "flex-col": layout === 'vertical',
        "flex-row": layout === 'horizontal',
    });
    
    const childrenContainerClasses = cn("flex", {
        "flex-row justify-center gap-4": layout === 'vertical',
        "flex-col justify-start gap-4": layout === 'horizontal',
    });

    const connectorClasses = cn("bg-border", {
        "w-0.5 h-8 mx-auto": layout === 'vertical', // Vertical line
        "h-0.5 w-8 my-auto": layout === 'horizontal', // Horizontal line
    });

    return (
        <div className={containerClasses}>
            {nodeContent}
            {hasSubtasks && (
                <>
                    <div className={connectorClasses}></div>
                    <div className={childrenContainerClasses}>
                        {task.subtasks.map(subtask => (
                            <MindMapNode 
                                key={subtask.id} 
                                task={subtask} 
                                onNodeClick={onNodeClick} 
                                layout={layout}
                                level={level + 1}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export function MindMapView({ project, activeTask, onItemSelect }: MindMapProps) {
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
    const [scale, setScale] = useState(1);
    const mapRef = useRef<HTMLDivElement>(null);
    
    const rootTask: Task = activeTask ? activeTask : {
        id: project.id,
        text: project.name,
        completed: false,
        status: 'inprogress',
        subtasks: project.tasks,
        lastEdited: project.lastEdited,
        order: project.order,
        parentId: null,
        comments: [],
    };
    
    const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2)); // Max zoom 2x
    const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.2)); // Min zoom 0.2x

    const handleWheelZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        const newScale = scale - e.deltaY * 0.001;
        setScale(Math.max(0.2, Math.min(newScale, 2))); // Clamp scale between 0.2 and 2
    };

    return (
        <div className="p-4 bg-card rounded-lg border overflow-auto relative" ref={mapRef} onWheel={handleWheelZoom}>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                 <ToggleGroup 
                    type="single" 
                    value={layout} 
                    onValueChange={(value) => {
                        if (value) setLayout(value as 'vertical' | 'horizontal');
                    }}
                    aria-label="Mind map layout"
                >
                    <ToggleGroupItem value="vertical" aria-label="Vertical layout">
                        <GitCommitVertical className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="horizontal" aria-label="Horizontal layout">
                        <GitCommitHorizontal className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>

                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                    <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-10 text-center">{(scale * 100).toFixed(0)}%</span>
                     <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            <div className="w-full min-h-[50vh] flex items-center justify-center p-4">
                <div 
                    className="transition-transform duration-200"
                    style={{ transform: `scale(${scale})`}}
                >
                    <MindMapNode task={rootTask} onNodeClick={onItemSelect} layout={layout} level={0} />
                </div>
            </div>

             {project.tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                    <p className="font-semibold">This folder is empty.</p>
                    <p className="text-sm">Use the input above to add a new scope.</p>
                </div>
            )}
        </div>
    );
}
