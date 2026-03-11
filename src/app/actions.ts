
'use server';

import { generateProjectSummary, type GenerateProjectSummaryInput } from '@/ai/flows/generate-project-summary';
import { executeTask, type ExecuteTaskInput } from '@/ai/flows/execute-task';
import { generateTaskSteps, type GenerateTaskStepsInput, type GenerateTaskStepsOutput } from '@/ai/flows/generate-task-steps';
import { z } from 'zod';
import { rephraseGoal, type RephraseGoalInput, type RephraseGoalOutput } from '@/ai/flows/rephrase-goal';
import { generateAlternativeScope, type AlternativeScopeInput, type AlternativeScopeOutput } from '@/ai/flows/generate-alternative-scope';
import { proposeChanges, type ProposeChangesInput } from '@/ai/flows/propose-changes';
import { type Task, type Project, type CommentStatus, type TaskStatus, type Comment, type ExecutionResult } from '@/lib/types';
import { type AiSettings } from '@/ai/ai-settings';

// Optional AI settings schema for validation (permissive - just pass through)
const AiSettingsSchema = z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().min(100).max(128000).optional(),
}).optional();


// Input length limits to prevent abuse
const MAX_GOAL_LENGTH = 5000;
const MAX_USER_INPUT_LENGTH = 10000;
const MAX_PROJECT_NAME_LENGTH = 200;

const GenerateTasksInputSchema = z.object({
    goal: z.string().min(1, 'Goal is required').max(MAX_GOAL_LENGTH, `Goal must be under ${MAX_GOAL_LENGTH} characters`),
    userInput: z.string().max(MAX_USER_INPUT_LENGTH).optional(),
    projectName: z.string().max(MAX_PROJECT_NAME_LENGTH).optional(),
    existingTasks: z.array(z.string().max(500)).max(200).optional(),
    photoDataUri: z.string().optional(),
    aiSettings: AiSettingsSchema,
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
            aiSettings: validatedInput.aiSettings as AiSettings | undefined,
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
    aiSettings: AiSettingsSchema,
});
type RephraseInput = z.infer<typeof RephraseInputSchema>;

export async function handleRephraseGoal(input: RephraseInput): Promise<{ success: boolean; data?: RephraseGoalOutput; error?: string }> {
    try {
        const validated = RephraseInputSchema.parse(input);
        const flowInput: RephraseGoalInput = { ...validated, aiSettings: validated.aiSettings as AiSettings | undefined };
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

export async function handleGenerateProjectSummary(project: Project, activeTask?: Task, previousSummary?: string, aiSettings?: AiSettings) {
    try {
        const itemToSummarize = activeTask ? activeTask : project;
        const aiPayload: GenerateProjectSummaryInput = {
            itemToSummarize: transformItemForAI(itemToSummarize),
            contextName: project.name, // Always use the root folder name for context
            previousSummary,
            aiSettings,
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
    aiSettings: AiSettingsSchema,
});

export async function handleExecuteTask(input: ExecuteTaskInput) {
    try {
        const validatedInput = executeTaskSchema.parse(input);
        const result = await executeTask({ ...validatedInput, aiSettings: validatedInput.aiSettings as AiSettings | undefined });
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
    aiSettings: AiSettingsSchema,
});

type AlternativeInput = z.infer<typeof AlternativeScopeInputSchema>;

export async function handleGenerateAlternativeScope(input: AlternativeInput): Promise<{ success: boolean; data?: AlternativeScopeOutput; error?: string }> {
    try {
        const validated = AlternativeScopeInputSchema.parse(input);
        const result = await generateAlternativeScope({ ...validated, aiSettings: validated.aiSettings as AiSettings | undefined } as AlternativeScopeInput);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in handleGenerateAlternativeScope:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

// --- Proposal (preview-only) ---
const ProposeChangesSchema = z.object({
    mode: z.enum(['alternative', 'regenerate', 'subscope']),
    targetText: z.string(),
    projectName: z.string().optional(),
    parentPathTitles: z.array(z.string()).optional(),
    siblingTitles: z.array(z.string()).optional(),
    existingChildren: z.array(z.string()).optional(),
    userInput: z.string().optional(),
    aiSettings: AiSettingsSchema,
});
type ProposalInput = z.infer<typeof ProposeChangesSchema>;

export async function handleProposeChanges(input: ProposalInput): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const validated = ProposeChangesSchema.parse(input);
        const flowInput = { ...validated, aiSettings: validated.aiSettings as AiSettings | undefined } as ProposeChangesInput;
        const result = await proposeChanges(flowInput);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in handleProposeChanges:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}
