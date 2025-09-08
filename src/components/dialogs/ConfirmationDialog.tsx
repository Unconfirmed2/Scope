'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/forms/ImageUpload';
import { formatAIText, prettyPrintForDisplay } from '@/lib/text-utils';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: { type: 'initial' | 'subscope' | 'regenerate' | 'alternative'; targetTaskId?: string };
  isGenerating: boolean;
  refinedGoal: string | null;
  aiConfirmationResponse: { raw: any } | null;
  goal: string;
  proposal: string | null;
  confirmationInput: string;
  confirmationImage: {file: File, dataUri: string} | null;
  onConfirmationInputChange: (input: string) => void;
  onConfirmationImageChange: (image: {file: File, dataUri: string} | null) => void;
  onAccept: () => void;
  onCancel: () => void;
}

// Pretty-print JSON for human-readable preview with proper formatting
const prettyPrintJson = (data: any): string => {
  return prettyPrintForDisplay(data);
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  mode,
  isGenerating,
  refinedGoal,
  aiConfirmationResponse,
  goal,
  proposal,
  confirmationInput,
  confirmationImage,
  onConfirmationInputChange,
  onConfirmationImageChange,
  onAccept,
  onCancel
}: ConfirmationDialogProps) {
  const isRefineMode = Boolean(confirmationInput.trim() || confirmationImage);
  
  const renderConfirmationJson = (data: any) => {
    console.log('DEBUG: ConfirmationDialog data:', data);
    console.log('DEBUG: ConfirmationDialog refinedGoal:', refinedGoal);
    console.log('DEBUG: ConfirmationDialog goal:', goal);
    const text = prettyPrintJson(data);
    if (!text) return null;
    return (
      <pre className="text-xs md:text-sm whitespace-pre-wrap break-words">{text}</pre>
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen && proposal !== null) {
      // Reset proposal when dialog closes
      onConfirmationImageChange(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isRefineMode ? 'Refine' : (
              mode.type === 'initial' ? 'Accept & add scopes' :
              mode.type === 'subscope' ? 'Accept & generate sub-scopes' :
              mode.type === 'regenerate' ? 'Accept & regenerate sub-scopes' :
              'Accept & replace with alternative'
            )}
          </DialogTitle>
          <DialogDescription>
            {isRefineMode
              ? 'Add details or feedback, then click "Refine scope" to iterate. Repeat until you are satisfied.'
              : (
                mode.type === 'initial'
                  ? 'Review the scope. When you are ready, click "Accept & add scopes" to generate tasks.'
                  : mode.type === 'subscope'
                    ? 'Review the parent scope and any notes. When ready, click "Accept & generate sub-scopes".'
                    : mode.type === 'regenerate'
                      ? 'Review the parent scope and any notes. When ready, click "Accept & regenerate sub-scopes".'
                      : 'Replace this scope with an alternative and update only truly dependent items.'
              )}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow border rounded-md p-4 bg-background/50 space-y-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Current scope</div>
            {renderConfirmationJson(refinedGoal ?? aiConfirmationResponse?.raw ?? goal)}
          </div>
          {mode.type !== 'initial' && (
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Proposed changes (preview)</div>
              <div className="text-sm whitespace-pre-wrap">
                {proposal === '' && <span className="text-muted-foreground">Preparing preview…</span>}
                {proposal === null && <span className="text-muted-foreground">No preview available.</span>}
                {typeof proposal === 'string' && proposal !== '' && <span>{formatAIText(proposal)}</span>}
              </div>
            </div>
          )}
        </ScrollArea>
        
        <div className="space-y-2 mt-4">
          <Label htmlFor="confirmation-input">Add details or feedback (optional)</Label>
          <Textarea
            id="confirmation-input"
            value={confirmationInput}
            onChange={(e) => onConfirmationInputChange(e.target.value)}
            placeholder="e.g., 'Make the first step more detailed' or 'Add a section about marketing'."
            rows={3}
          />
        </div>
        
        <ImageUpload
          image={confirmationImage}
          onImageChange={onConfirmationImageChange}
          variant="button"
          size="small"
          label="Add an image for more context (optional)"
          className="mt-2"
        />
        
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          {isRefineMode ? (
            <Button onClick={onAccept} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="animate-spin" /> : 'Refine scope'}
            </Button>
          ) : (
            <Button onClick={onAccept} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="animate-spin" />
              ) : mode.type === 'initial' ? (
                'Accept & add scopes'
              ) : mode.type === 'subscope' ? (
                'Accept & generate sub-scopes'
              ) : mode.type === 'regenerate' ? (
                'Accept & regenerate sub-scopes'
              ) : (
                'Accept & replace with alternative'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}