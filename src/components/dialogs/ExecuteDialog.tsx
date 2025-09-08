'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Zap } from 'lucide-react';
import type { Task } from '@/lib/types';

interface ExecuteDialogProps {
  task: Task | null;
  executionInput: string;
  onExecutionInputChange: (input: string) => void;
  onExecute: () => void;
  onCancel: () => void;
}

export function ExecuteDialog({ 
  task, 
  executionInput, 
  onExecutionInputChange, 
  onExecute, 
  onCancel 
}: ExecuteDialogProps) {
  return (
    <Dialog open={!!task} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Execute Scope</DialogTitle>
          <DialogDescription>
            The AI will attempt to research and complete this scope. You can provide additional instructions or context below.
            <div className="font-semibold mt-2">{task?.text}</div>
          </DialogDescription>
        </DialogHeader>
        <Textarea 
          value={executionInput}
          onChange={(e) => onExecutionInputChange(e.target.value)}
          placeholder="e.g., 'Focus on solutions for a small business' or 'Provide code examples in Python'."
          rows={4}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onExecute}>
            <Zap className="mr-2"/>
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}