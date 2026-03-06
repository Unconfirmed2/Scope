
'use client';

import type { Project, Task, TaskStatus } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn, formatTasksToText } from '@/lib/utils';
import type { FormatTextOptions } from '@/lib/utils';
import { Button } from './ui/button';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { GitCommitHorizontal, GitCommitVertical, ZoomIn, ZoomOut, Copy, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

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
    level,
}: {
    task: Task;
    onNodeClick: (taskId: string) => void;
    layout: 'vertical' | 'horizontal';
    level: number;
}) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isRoot = level === 0;

    const nodeContent = (
        <div
            onClick={(e) => { e.stopPropagation(); onNodeClick(task.id); }}
            className={cn(
                'relative rounded-xl border-2 shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all text-center select-none',
                isRoot ? 'px-6 py-4 font-bold text-base min-w-[120px]' : 'px-3 py-2 text-sm max-w-[180px]',
                statusColors[task.status],
            )}
        >
            <p className="line-clamp-3 break-words leading-snug">{task.text}</p>
            {hasSubtasks && (
                <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-xs pointer-events-none"
                >
                    {task.subtasks.length}
                </Badge>
            )}
        </div>
    );

    const isVertical = layout === 'vertical';

    const containerClasses = cn('flex items-center justify-center', isVertical ? 'flex-col' : 'flex-row');

    const childrenContainerClasses = cn('flex', isVertical ? 'flex-row items-start justify-center gap-6' : 'flex-col justify-start gap-5');

    // Connector from parent node to the branch point
    const connectorClasses = cn('shrink-0 bg-border/70', isVertical ? 'w-px h-6 mx-auto' : 'h-px w-6 my-auto');

    // Each child gets wrapped with its own small connector
    const childConnectorClasses = cn('shrink-0 bg-border/70', isVertical ? 'w-px h-4 mx-auto' : 'h-px w-4 my-auto');

    return (
        <div className={containerClasses}>
            {nodeContent}
            {hasSubtasks && (
                <>
                    <div className={connectorClasses} />
                    <div className={childrenContainerClasses}>
                        {task.subtasks.map((subtask) => (
                            <div key={subtask.id} className={cn('flex items-center justify-center', isVertical ? 'flex-col' : 'flex-row')}>
                                <div className={childConnectorClasses} />
                                <MindMapNode
                                    task={subtask}
                                    onNodeClick={onNodeClick}
                                    layout={layout}
                                    level={level + 1}
                                />
                            </div>
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
    const [numbered, setNumbered] = useState(false);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const lastPos = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const { toast } = useToast();

    const rootTask: Task = activeTask
        ? activeTask
        : {
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

    // Pan via drag — window listeners so drag works outside the div
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isPanningRef.current) return;
            setPanX((x) => x + (e.clientX - lastPos.current.x));
            setPanY((y) => y + (e.clientY - lastPos.current.y));
            lastPos.current = { x: e.clientX, y: e.clientY };
        };
        const onUp = () => {
            if (!isPanningRef.current) return;
            isPanningRef.current = false;
            setIsPanning(false);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Don't hijack clicks on interactive elements
        if ((e.target as HTMLElement).closest('button, a, input, select')) return;
        isPanningRef.current = true;
        setIsPanning(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
    }, []);

    const handleZoomIn = () => setScale((s) => Math.min(+(s + 0.1).toFixed(2), 2));
    const handleZoomOut = () => setScale((s) => Math.max(+(s - 0.1).toFixed(2), 0.2));

    // Copy: root is a title (unnumbered), children start at 1.
    const handleCopy = () => {
        const opts: FormatTextOptions = { numbered, includeDescription: true };
        let text: string;
        if (activeTask) {
            // Active task is the "root" — print as a title, number its children
            text = activeTask.text + '\n';
            if (activeTask.subtasks?.length) {
                text += formatTasksToText(activeTask.subtasks, opts);
            }
        } else {
            // Project-level: tasks ARE the first level, number them directly
            text = formatTasksToText(project.tasks, opts);
        }
        navigator.clipboard.writeText(text).then(
            () => toast({ title: 'Mind map copied to clipboard!' }),
            () => toast({ variant: 'destructive', title: 'Failed to copy' }),
        );
    };

    return (
        <TooltipProvider>
            <div
                ref={mapRef}
                className="relative bg-card rounded-lg border overflow-hidden"
                style={{
                    minHeight: '60vh',
                    cursor: isPanning ? 'grabbing' : 'grab',
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Controls — fixed to top-right, won't pan with content */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
                    {/* Copy controls */}
                    <div className="flex items-center gap-1 rounded-md border bg-background/95 backdrop-blur-sm p-1 shadow-sm">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={numbered ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setNumbered((n) => !n)}
                                >
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{numbered ? 'Switch to bullets' : 'Switch to numbering'}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy as text</p></TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Layout toggle */}
                    <ToggleGroup
                        type="single"
                        value={layout}
                        onValueChange={(value) => { if (value) setLayout(value as 'vertical' | 'horizontal'); }}
                        aria-label="Mind map layout"
                        className="border rounded-md bg-background/95 backdrop-blur-sm shadow-sm p-1"
                    >
                        <ToggleGroupItem value="vertical" aria-label="Vertical layout" className="h-8 w-8">
                            <GitCommitVertical className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="horizontal" aria-label="Horizontal layout" className="h-8 w-8">
                            <GitCommitHorizontal className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 rounded-md border bg-background/95 backdrop-blur-sm p-1 shadow-sm">
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm w-10 text-center tabular-nums">{(scale * 100).toFixed(0)}%</span>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Pannable + scaleable canvas */}
                <div
                    className="w-full flex items-center justify-center p-16"
                    style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                        transformOrigin: 'center center',
                        minHeight: '60vh',
                        willChange: 'transform',
                    }}
                >
                    <MindMapNode task={rootTask} onNodeClick={onItemSelect} layout={layout} level={0} />
                </div>

                {project.tasks.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground pointer-events-none">
                        <p className="font-semibold">This folder is empty.</p>
                        <p className="text-sm">Use the input above to add a new scope.</p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
