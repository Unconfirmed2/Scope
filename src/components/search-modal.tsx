
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { Search, ChevronRight, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Task } from '@/lib/types';

type SearchResult = {
  projectId: string;
  projectName: string;
  taskId: string;
  taskText: string;
  path: string[];
  description?: string;
};

type SearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSelect: (selection: { projectId: string; taskId: string | null }) => void;
};

function collectTasks(tasks: Task[], projectId: string, projectName: string, parentPath: string[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const task of tasks) {
    const currentPath = [...parentPath, task.text];
    results.push({
      projectId,
      projectName,
      taskId: task.id,
      taskText: task.text,
      path: currentPath,
      description: task.description,
    });
    if (task.subtasks?.length) {
      results.push(...collectTasks(task.subtasks, projectId, projectName, currentPath));
    }
  }
  return results;
}

export function SearchModal({ open, onOpenChange, projects, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => {
    const items: SearchResult[] = [];
    for (const project of projects) {
      items.push(...collectTasks(project.tasks, project.id, project.name, []));
    }
    return items;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 50);
    const lower = query.toLowerCase();
    return allItems
      .filter(item =>
        item.taskText.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower) ||
        item.projectName.toLowerCase().includes(lower)
      )
      .slice(0, 50);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((result: SearchResult) => {
    onSelect({ projectId: result.projectId, taskId: result.taskId });
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  }, [filtered, selectedIndex, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search scopes..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
          )}
          {filtered.map((result, index) => (
            <button
              key={`${result.taskId}-${index}`}
              onClick={() => handleSelect(result)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-accent/50 flex flex-col gap-0.5",
                index === selectedIndex && "bg-accent"
              )}
            >
              <span className="font-medium truncate">{result.taskText}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <FolderOpen className="h-3 w-3 shrink-0" />
                {result.projectName}
                {result.path.length > 1 && (
                  <>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{result.path.slice(0, -1).join(' > ')}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex gap-3">
          <span><kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-muted px-1">↵</kbd> select</span>
          <span><kbd className="rounded border bg-muted px-1">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
