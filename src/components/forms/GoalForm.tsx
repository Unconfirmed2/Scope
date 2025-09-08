'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, FilePlus2 } from 'lucide-react';
import { ImageUpload } from '@/components/forms/ImageUpload';

interface GoalFormProps {
  goal: string;
  goalImage: {file: File, dataUri: string} | null;
  isGenerating: boolean;
  isLoaded: boolean;
  onGoalChange: (goal: string) => void;
  onGoalImageChange: (image: {file: File, dataUri: string} | null) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onCreateManualTemplate: () => void;
}

export function GoalForm({
  goal,
  goalImage,
  isGenerating,
  isLoaded,
  onGoalChange,
  onGoalImageChange,
  onSubmit,
  onCreateManualTemplate
}: GoalFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <Input 
          id="goal-input"
          value={goal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="What do you want to accomplish?"
          className="text-base flex-grow"
          disabled={isGenerating || !isLoaded}
        />
        <div className="flex w-full md:w-auto items-center justify-end gap-2 flex-shrink-0">
          <Button size="icon" type="submit" disabled={isGenerating || !goal.trim() || !isLoaded}>
            {isGenerating ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
          <ImageUpload
            image={goalImage}
            onImageChange={onGoalImageChange}
            variant="icon"
            disabled={isGenerating}
          />
          <Button onClick={onCreateManualTemplate} disabled={!isLoaded} type="button">
            <FilePlus2 />
            <span>Blank Template</span>
          </Button>
        </div>
      </div>
    </form>
  );
}