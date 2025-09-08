'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListTree, Waypoints, KanbanSquare, Zap, MessageSquare, FileText, Menu } from 'lucide-react';
import { TreeViewWrapper as TreeView } from '@/components/tree-view';
import { KanbanView } from '@/components/kanban-view';
import { CommentsView } from '@/components/comments-view';
import { MindMapView } from '@/components/mind-map-view';
import { SummaryView } from '@/components/summary-view';
import { ExecutionView } from '@/components/execution-view';
import type { Project, Task, SortOption, CommentStatus } from '@/lib/types';

interface TabViewsProps {
  // Current state
  activeTab: string;
  activeProject: Project;
  activeTask: Task | null;
  projects: Project[];
  selectedTaskIds: string[];
  taskSortOption: SortOption;
  totalCommentCount: number;
  recentlyChanged: Record<string, { kind: 'new' | 'updated'; at: number }>;
  
  // State setters
  onActiveTabChange: (tab: string) => void;
  onSelectedTaskIdsChange: (ids: string[]) => void;
  onTaskSortOptionChange: (option: SortOption) => void;
  onActiveItemSelect: (selection: { projectId: string; taskId: string | null }) => void;
  
  // Actions
  onUpdateTaskAndPropagate: (projectId: string, task: Task) => void;
  onUpdateProject: (project: Project) => void;
  onMoveTask: (taskId: string, sourceProjectId: string, targetProjectId: string) => boolean;
  onPromoteSubtask: (projectId: string, taskId: string) => boolean;
  onAddSubtask: (projectId: string, parentId: string, subtasks: Task[], isSibling: boolean) => boolean;
  onDeleteTask: (projectId: string, taskId: string) => boolean;
  onAddComment: (projectId: string, taskId: string, text: string) => boolean;
  onAddReply: (projectId: string, taskId: string, commentId: string, text: string) => boolean;
  onUpdateComment: (projectId: string, taskId: string, commentId: string, text?: string, newStatus?: CommentStatus) => boolean;
  onDeleteComment: (projectId: string, taskId: string, commentId: string) => boolean;
  onExecuteTask: (projectId: string, taskId: string, taskText: string, input: string, projectName?: string, otherTasks?: string[]) => Promise<boolean>;
  onGenerateSummary: () => Promise<void>;
  onOpenCommentDialog: (task: Task) => void;
  onOpenExecuteDialog: (task: Task) => void;
  onOpenSubscopeDialog: (task: Task, isRegen: boolean) => void;
  onOpenRephraseDialog: (task: Task) => void;
  
  // Toasts
  onToast: (toast: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

const viewOptions: Record<string, { label: string; icon: React.ElementType; hidden?: boolean }> = {
  'list': { label: 'List View', icon: ListTree },
  'mindmap': { label: 'Mind Map', icon: Waypoints },
  'kanban': { label: 'Kanban View', icon: KanbanSquare },
  'execution': { label: 'Execution', icon: Zap },
  'comments': { label: 'Comments', icon: MessageSquare },
  'summary': { label: 'Summary', icon: FileText },
};

const visibleViewOptions = Object.entries(viewOptions).filter(([, { hidden }]) => !hidden);

export function TabViews({
  activeTab,
  activeProject,
  activeTask,
  projects,
  selectedTaskIds,
  taskSortOption,
  totalCommentCount,
  recentlyChanged,
  onActiveTabChange,
  onSelectedTaskIdsChange,
  onTaskSortOptionChange,
  onActiveItemSelect,
  onUpdateTaskAndPropagate,
  onUpdateProject,
  onMoveTask,
  onPromoteSubtask,
  onAddSubtask,
  onDeleteTask,
  onAddComment,
  onAddReply,
  onUpdateComment,
  onDeleteComment,
  onExecuteTask: _onExecuteTask,
  onGenerateSummary,
  onOpenCommentDialog,
  onOpenExecuteDialog,
  onOpenSubscopeDialog,
  onOpenRephraseDialog,
  onToast
}: TabViewsProps) {
  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-4">
        {/* Tabs for larger screens */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={onActiveTabChange}>
            <TabsList>
              {visibleViewOptions.map(([key, { label, icon: Icon }]) => (
                <TabsTrigger key={key} value={key}>
                  <Icon className="mr-2" />
                  {label}
                  {key === 'comments' && totalCommentCount > 0 && <Badge className="ml-2 h-5">{totalCommentCount}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {/* Dropdown for smaller screens */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{viewOptions[activeTab as keyof typeof viewOptions].label}</span>
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
              {visibleViewOptions.map(([key, { label, icon: Icon }]) => (
                <DropdownMenuItem key={key} onSelect={() => onActiveTabChange(key)}>
                  <Icon className="mr-2" />
                  {label}
                  {key === 'comments' && totalCommentCount > 0 && <Badge className="ml-auto h-5">{totalCommentCount}</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={onActiveTabChange} className="w-full">
        <TabsList className="hidden">
          {Object.entries(viewOptions).map(([key]) => (
            <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="list">
          <TreeView 
            tasks={activeTask ? [activeTask] : activeProject.tasks}
            project={activeProject}
            allProjects={projects}
            selectedTaskIds={selectedTaskIds}
            onSetSelectedTaskIds={onSelectedTaskIdsChange}
            onUpdateTaskAndPropagate={onUpdateTaskAndPropagate}
            onUpdateProject={onUpdateProject}
            onMoveTask={(...args) => {
              if (onMoveTask(...args)) {
                onToast({ title: 'Scope moved' });
              }
            }}
            onPromoteSubtask={(...args) => {
              if (onPromoteSubtask(...args)) {
                onToast({ title: 'Scope promoted' });
              }
            }}
            onAddSubtask={(...args) => {
              if (onAddSubtask(...args)) {
                onToast({ title: 'Sub-scope added' });
              }
            }}
            onAddCommentClick={onOpenCommentDialog}
            onExecuteClick={onOpenExecuteDialog}
            onDeleteTask={(projectId, taskId) => {
              if (onDeleteTask(projectId, taskId)) {
                onToast({ title: 'Scope deleted', variant: 'default' });
              }
            }}
            sortOption={taskSortOption}
            onSetSortOption={onTaskSortOptionChange}
            recentlyChanged={recentlyChanged}
            onOpenSubscopeDialog={onOpenSubscopeDialog}
            onOpenRephraseDialog={onOpenRephraseDialog}
          />
        </TabsContent>
        
        <TabsContent value="mindmap">
          <MindMapView 
            project={activeProject}
            activeTask={activeTask}
            onItemSelect={(taskId) => onActiveItemSelect({ projectId: activeProject.id, taskId })}
          />
        </TabsContent>
        
        <TabsContent value="kanban">
          <KanbanView
            project={activeProject}
            activeTask={activeTask}
            onUpdateTaskAndPropagate={onUpdateTaskAndPropagate}
            onItemSelect={(selection) => onActiveItemSelect({ ...selection })}
          />
        </TabsContent>
        
        <TabsContent value="comments">
          <CommentsView 
            project={activeProject}
            activeTask={activeTask || undefined}
            onAddComment={(...args) => {
              const result = onAddComment(...args);
              if (result) {
                onToast({ title: 'Comment added', variant: 'default' });
              }
              return result;
            }}
            onAddReply={(...args) => {
              const result = onAddReply(...args);
              if (result) {
                onToast({ title: 'Reply added', variant: 'default' });
              }
              return result;
            }}
            onUpdateComment={(...args) => {
              const result = onUpdateComment(...args);
              if (result) {
                onToast({ title: 'Comment updated', variant: 'default' });
              }
              return result;
            }}
            onDeleteComment={(...args) => {
              const result = onDeleteComment(...args);
              if (result) {
                onToast({ title: 'Comment deleted', variant: 'default' });
              }
              return result;
            }}
            onItemSelect={(taskId) => onActiveItemSelect({ projectId: activeProject.id, taskId: taskId })}
          />
        </TabsContent>
        
        <TabsContent value="execution">
          <ExecutionView
            project={activeProject}
            activeTask={activeTask}
            onItemSelect={(taskId) => onActiveItemSelect({ projectId: activeProject.id, taskId: taskId })}
          />
        </TabsContent>
        
        <TabsContent value="summary">
          <SummaryView 
            project={activeProject}
            activeTask={activeTask}
            onGenerateSummary={onGenerateSummary}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}