'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutPanelLeft, Pencil, RotateCcw, RotateCw, History, Settings, HelpCircle, LogOut, User, Save, Edit } from 'lucide-react';
import type { Project } from '@/lib/types';
import type { AppUser as AuthUser } from '@/hooks/use-auth';

interface AppHeaderProps {
  // Sidebar controls
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  
  // Project management
  activeProject: Project | null;
  sortedProjects: Project[];
  isEditingProjectName: boolean;
  onSetIsEditingProjectName: (editing: boolean) => void;
  onProjectNameChange: (e: React.FormEvent<HTMLInputElement>) => void;
  onProjectNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectProject: (projectId: string, taskId: string | null) => void;
  onCreateProject: (name: string) => void;
  
  // Project description
  isEditingDescription: boolean;
  descriptionText: string;
  onSetIsEditingDescription: (editing: boolean) => void;
  onDescriptionTextChange: (text: string) => void;
  onSaveDescription: () => void;
  
  // History controls
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHistory: () => void;
  
  // User and dialogs
  user: AuthUser | null;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenAuth: () => void;
  onLogOut: () => void;
}

export function AppHeader({
  isSidebarOpen: _isSidebarOpen,
  onToggleSidebar,
  activeProject,
  sortedProjects,
  isEditingProjectName,
  onSetIsEditingProjectName,
  onProjectNameChange,
  onProjectNameKeyDown,
  onSelectProject,
  onCreateProject,
  isEditingDescription,
  descriptionText,
  onSetIsEditingDescription,
  onDescriptionTextChange,
  onSaveDescription,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenHistory,
  user,
  onOpenSettings,
  onOpenHelp,
  onOpenAuth,
  onLogOut
}: AppHeaderProps) {
  return (
    <header className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <LayoutPanelLeft />
          </Button>
          <div className="flex items-center gap-2">
            {isEditingProjectName && activeProject ? (
              <Input
                value={activeProject.name}
                onChange={onProjectNameChange}
                onBlur={() => onSetIsEditingProjectName(false)}
                onKeyDown={onProjectNameKeyDown}
                className="text-xl font-semibold p-2 h-auto"
                autoFocus
              />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-xl font-semibold p-2 h-auto" disabled={!activeProject}>
                    {activeProject?.name || 'Select a Folder'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Switch Folder</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sortedProjects.filter(p => p.id !== activeProject?.id).map(p => (
                    <DropdownMenuItem key={p.id} onClick={() => onSelectProject(p.id, null)}>
                      <span>{p.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onCreateProject('New Folder')}>
                    Create New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {activeProject && !isEditingProjectName && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSetIsEditingProjectName(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenHistory} title="History">
            <History className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                <Avatar>
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>{user?.displayName?.substring(0, 1) || user?.email?.substring(0, 1) || <User />}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenSettings}>
                    <Settings className="mr-2"/> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenHelp}>
                    <HelpCircle className="mr-2"/> Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogOut}>
                    <LogOut className="mr-2"/> Sign Out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onOpenAuth}>
                  <User className="mr-2"/> Login / Sign Up
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {activeProject && (
        <div className="mt-2 pl-12">
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionText}
                onChange={(e) => onDescriptionTextChange(e.target.value)}
                placeholder="Add a folder description..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => onSetIsEditingDescription(false)} variant="ghost" size="sm">Cancel</Button>
                <Button onClick={onSaveDescription} size="sm"><Save className="mr-2"/>Save</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground group flex items-center gap-2">
              <p className="flex-grow">{descriptionText || 'No description yet. Add one!'}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button onClick={() => onSetIsEditingDescription(true)} variant="ghost" size="icon" className="h-7 w-7">
                  <Edit className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}