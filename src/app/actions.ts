
'use server';

import { generateProjectSummary, type GenerateProjectSummaryInput } from '@/ai/flows/generate-project-summary';
import { executeTask, type ExecuteTaskInput } from '@/ai/flows/execute-task';
import { generateTaskSteps, type GenerateTaskStepsInput, type GenerateTaskStepsOutput } from '@/ai/flows/generate-task-steps';
import { z } from 'zod';
import { rephraseGoal, type RephraseGoalInput, type RephraseGoalOutput } from '@/ai/flows/rephrase-goal';
import { generateAlternativeScope, type AlternativeScopeInput, type AlternativeScopeOutput } from '@/ai/flows/generate-alternative-scope';
import { type Task, type Project, type CommentStatus, type TaskStatus, type Comment, type ExecutionResult } from '@/lib/types';
import { previewChange, type PreviewChangeInput, type PreviewChangeOutput } from '@/ai/flows/preview-change';


const GenerateTasksInputSchema = z.object({
    goal: z.string(),
    userInput: z.string().optional(),
    projectName: z.string().optional(),
    existingTasks: z.array(z.string()).optional(),
    photoDataUri: z.string().optional(),
});
type GenerateTasksInput = z.infer<typeof GenerateTasksInputSchema>;

export async function handleGenerateTasks(input: GenerateTasksInput): Promise<{ success: boolean; data?: GenerateTaskStepsOutput, error?: string }> {
     try {
        const validatedInput = GenerateTasksInputSchema.parse(input);
        
    const flowInput: GenerateTaskStepsInput = {
            goal: validatedInput.goal,
            userInput: validatedInput.userInput,
            projectName: validatedInput.projectName,
            existingTasks: validatedInput.existingTasks,
            photoDataUri: validatedInput.photoDataUri,
        };

        const result = await generateTaskSteps(flowInput);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error in handleGenerateTasks:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

const RephraseInputSchema = z.object({
    goal: z.string(),
    userInput: z.string().optional(),
    projectName: z.string().optional(),
    existingTasks: z.array(z.string()).optional(),
    photoDataUri: z.string().optional(),
});
type RephraseInput = z.infer<typeof RephraseInputSchema>;

export async function handleRephraseGoal(input: RephraseInput): Promise<{ success: boolean; data?: RephraseGoalOutput; error?: string }> {
    try {
        const validated = RephraseInputSchema.parse(input);
        const flowInput: RephraseGoalInput = validated;
        const result = await rephraseGoal(flowInput);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in handleRephraseGoal:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

const transformItemForAI = (item: Project | Task) => {
    type AiComment = { text: string; status: CommentStatus; replies: AiComment[] };
    type AiExecutionResult = { resultText: string };
    type AiTask = {
        text: string;
        status: TaskStatus;
        subtasks: AiTask[];
        comments: AiComment[];
        executionResults: AiExecutionResult[];
    };

    const transformComments = (comments: Comment[] = []): AiComment[] => {
        return comments.map((c) => ({
            text: c.text,
            status: c.status,
            replies: c.replies ? transformComments(c.replies) : [],
        }));
    };

    const transformExecutionResults = (results: ExecutionResult[] = []): AiExecutionResult[] => {
        return results.map((r) => ({ resultText: r.resultText }));
    };

    const transformTasks = (tasks: Task[] = []): AiTask[] => {
        return tasks.map((t) => ({
            text: t.text,
            status: t.status,
            subtasks: t.subtasks ? transformTasks(t.subtasks) : [],
            comments: t.comments ? transformComments(t.comments) : [],
            executionResults: t.executionResults ? transformExecutionResults(t.executionResults) : [],
        }));
    };

    if ('tasks' in item) { // It's a Project
        return {
            name: item.name,
            description: item.description,
            tasks: transformTasks(item.tasks),
        };
    } else { // It's a Task
        return {
            type: 'task',
            text: item.text,
            status: item.status,
            subtasks: transformTasks(item.subtasks),
            comments: transformComments(item.comments),
            executionResults: transformExecutionResults(item.executionResults || []),
        };
    }
};

export async function handleGenerateProjectSummary(project: Project, activeTask?: Task, previousSummary?: string) {
    try {
        const itemToSummarize = activeTask ? activeTask : project;
        const aiPayload: GenerateProjectSummaryInput = {
            itemToSummarize: transformItemForAI(itemToSummarize),
            contextName: project.name, // Always use the root folder name for context
            previousSummary,
        }
        const result = await generateProjectSummary(aiPayload);
        return { success: true, summary: result.summary };
    } catch (error) {
        console.error("Error in handleGenerateProjectSummary:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

const executeTaskSchema = z.object({
    task: z.string(),
    userInput: z.string().optional(),
    projectName: z.string().optional(),
    otherTasks: z.array(z.string()).optional(),
});

export async function handleExecuteTask(input: ExecuteTaskInput) {
    try {
        const validatedInput = executeTaskSchema.parse(input);
        const result = await executeTask(validatedInput);
        return { success: true, result: result.result };
    } catch (error) {
        console.error("Error in handleExecuteTask:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

// Regenerate flow removed in favor of unified rephrase + generate paths

// --- Alternative Scope (replace with a different same-level item) ---
const DependencyCandidateSchema = z.object({
    id: z.string(),
    path: z.string(),
    text: z.string().optional(),
    description: z.string().optional(),
});

const AlternativeScopeInputSchema = z.object({
    selectedNode: z.object({
        id: z.string(),
        text: z.string(),
        description: z.string().optional(),
        subtasks: z.array(z.any()).optional(),
    }),
    parentPathTitles: z.array(z.string()),
    siblingTitles: z.array(z.string()),
    inferredType: z.string().optional(),
    dependencyCandidates: z.array(DependencyCandidateSchema),
    projectName: z.string().optional(),
    fullProjectJson: z.any().optional(),
    trimmedContext: z.any().optional(),
});

type AlternativeInput = z.infer<typeof AlternativeScopeInputSchema>;

export async function handleGenerateAlternativeScope(input: AlternativeInput): Promise<{ success: boolean; data?: AlternativeScopeOutput; error?: string }> {
    try {
        const validated = AlternativeScopeInputSchema.parse(input);
        const result = await generateAlternativeScope(validated as AlternativeScopeInput);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in handleGenerateAlternativeScope:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

// --- Preview change (lightweight, sentence only) ---
const PreviewInputSchema = z.object({
    type: z.enum(['alternative','subscopes','regenerate']),
    selectedText: z.string(),
    parentPathTitles: z.array(z.string()).optional(),
    projectName: z.string().optional(),
});
type PreviewInput = z.infer<typeof PreviewInputSchema>;

export async function handlePreviewChange(input: PreviewInput): Promise<{ success: boolean; data?: PreviewChangeOutput; error?: string }>{
    try {
        const validated = PreviewInputSchema.parse(input);
        const result = await previewChange(validated as PreviewChangeInput);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in handlePreviewChange:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}
