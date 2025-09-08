'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from '@/lib/types';

interface CommentDialogProps {
  task: Task | null;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CommentDialog({ 
  task, 
  commentText, 
  onCommentTextChange, 
  onSave, 
  onCancel 
}: CommentDialogProps) {
  return (
    <Dialog open={!!task} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add comment to scope</DialogTitle>
          <DialogDescription>
            {task?.text}
          </DialogDescription>
        </DialogHeader>
        <Textarea 
          value={commentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
          placeholder="Your comment..."
          rows={4}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={!commentText.trim()}>Save Comment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}