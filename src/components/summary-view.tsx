
'use client';

import { useState } from 'react';
import type { Project, Task, Summary } from '@/lib/types';
import { Button } from './ui/button';
import { BrainCircuit, Loader2 } from 'lucide-react';
import Linkify from 'linkify-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

type SummaryViewProps = {
    project: Project;
    activeTask: Task | null;
    onGenerateSummary: () => Promise<void>;
};

export function SummaryView({ project, activeTask, onGenerateSummary }: SummaryViewProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Determine the item to show summaries for (folder or selected scope)
    const summaryItem = activeTask || project;
    const summaries = summaryItem.summaries || [];

    const [selectedSummary, setSelectedSummary] = useState<Summary | null>(summaries?.[0] || null);

    React.useEffect(() => {
        // When the summary item changes, update the selected summary
        const newSummaries = activeTask ? activeTask.summaries || [] : project.summaries || [];
        const latestSummary = newSummaries[0] || null;
        setSelectedSummary(latestSummary);
    }, [activeTask, project]);

    const handleGenerateClick = async () => {
        setIsGenerating(true);
        await onGenerateSummary();
        setIsGenerating(false);
    };

    const hasSummaries = summaries.length > 0;
    const summaryTitle = 'name' in summaryItem ? summaryItem.name : summaryItem.text;

    return (
        <div className="flex gap-6 p-4 bg-card rounded-lg border max-w-7xl mx-auto">
            {hasSummaries && (
                <aside className="w-1/4 border-r pr-4">
                    <h4 className="font-semibold mb-4">History for "{summaryTitle}"</h4>
                    <div className="space-y-2">
                        {summaries?.map(summary => (
                            <button
                                key={summary.timestamp}
                                onClick={() => setSelectedSummary(summary)}
                                className={cn(
                                    "block w-full text-left p-2 rounded-md text-sm",
                                    selectedSummary?.timestamp === summary.timestamp ? 'bg-accent/20' : 'hover:bg-accent/10'
                                )}
                            >
                                <p className="font-medium">{format(new Date(summary.timestamp), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(summary.timestamp), 'h:mm a')}</p>
                            </button>
                        ))}
                    </div>
                </aside>
            )}
            <main className={cn("flex-1", hasSummaries && "w-3/4")}>
                {selectedSummary ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">
                                Summary from {format(new Date(selectedSummary.timestamp), 'MMMM d, yyyy - h:mm a')}
                            </h3>
                            <Button onClick={handleGenerateClick} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
                                Update Summary
                            </Button>
                        </div>
                        <div className="dark:prose-invert max-w-none p-4 border rounded-md bg-background/50">
                             <Linkify as="div" options={{ target: '_blank', className: 'text-primary underline' }}>
                                 {selectedSummary.text.split('\n').map((line, index) => (
                                     <React.Fragment key={index}>
                                         {line}
                                         <br />
                                     </React.Fragment>
                                 ))}
                            </Linkify>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <h3 className="font-semibold text-xl mb-2">No summary available for "{summaryTitle}".</h3>
                        <p className="text-muted-foreground mb-6">Generate an initial summary to get started.</p>
                        <Button onClick={handleGenerateClick} disabled={isGenerating} size="lg">
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
                            Generate Summary
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
