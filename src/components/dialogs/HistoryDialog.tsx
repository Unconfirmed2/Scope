'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HistoryEntry {
  label?: string;
  timestamp: number;
}

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyPast: HistoryEntry[];
  historyFuture: HistoryEntry[];
}

export function HistoryDialog({ 
  open, 
  onOpenChange, 
  historyPast, 
  historyFuture 
}: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>History</DialogTitle>
          <DialogDescription>Use Undo/Redo in the header to revert or reapply changes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Past (oldest → newest)</div>
            <ul className="max-h-48 overflow-auto border rounded p-2 text-sm">
              {historyPast.length === 0 ? (
                <li className="text-muted-foreground">No history yet</li>
              ) : (
                historyPast.map((h, i) => (
                  <li key={i} className="py-1 border-b last:border-b-0">
                    <div className="font-medium">{h.label || 'Change'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Future (will redo)</div>
            <ul className="max-h-24 overflow-auto border rounded p-2 text-sm">
              {historyFuture.length === 0 ? (
                <li className="text-muted-foreground">Empty</li>
              ) : (
                historyFuture.map((h, i) => (
                  <li key={i} className="py-1 border-b last:border-b-0">
                    <div className="font-medium">{h.label || 'Change'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}