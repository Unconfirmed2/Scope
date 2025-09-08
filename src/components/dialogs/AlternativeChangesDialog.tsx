'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatAIText } from '@/lib/text-utils';

interface ChangesSummary {
  replacedTitle: string;
  updatedTargets: string[];
  notes?: string[];
}

interface AlternativeChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changesSummary: ChangesSummary | null;
}

export function AlternativeChangesDialog({
  open,
  onOpenChange,
  changesSummary
}: AlternativeChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Changes applied</DialogTitle>
          <DialogDescription>We replaced the scope and updated related items.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {changesSummary && (
            <>
              <div>
                <span className="font-semibold">New Title:</span> {formatAIText(changesSummary.replacedTitle)}
              </div>
              <div>
                <span className="font-semibold">Updated Items:</span> {changesSummary.updatedTargets.length}
              </div>
              {changesSummary.notes && changesSummary.notes.length > 0 && (
                <div>
                  <div className="font-semibold">Notes</div>
                  <ul className="list-disc pl-5">
                    {changesSummary.notes.map((note, i) => (
                      <li key={i}>{formatAIText(note)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}