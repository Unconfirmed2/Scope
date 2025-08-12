
'use server';

import { generateProjectDescription } from '@/ai/flows/generate-project-description';
import { generateProjectSummary, type GenerateProjectSummaryInput } from '@/ai/flows/generate-project-summary';
import { executeTask, type ExecuteTaskInput } from '@/ai/flows/execute-task';
import { regenerateTask, type RegenerateTaskInput } from '@/ai/flows/regenerate-task';
import { generateTaskSteps, type GenerateTaskStepsInput, type GenerateTaskStepsOutput } from '@/ai/flows/generate-task-steps';
import { z } from 'zod';
import { Persona, type Task, type Project } from '@/lib/types';


const GenerateTasksInputSchema = z.object({
    goal: z.string(),
    userInput: z.string().optional(),
    projectName: z.string().optional(),
    existingTasks: z.array(z.string()).optional(),
    photoDataUri: z.string().optional(),
    persona: z.nativeEnum(Persona).optional().nullable(),
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
            persona: validatedInput.persona,
        };

        const result = await generateTaskSteps(flowInput);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error in handleGenerateTasks:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}

const transformItemForAI = (item: Project | Task) => {
    const transformComments = (comments: any[]): any[] => {
        return (comments || []).map(c => ({
            text: c.text,
            status: c.status,
            replies: c.replies ? transformComments(c.replies) : []
        }));
    };

    const transformExecutionResults = (results: any[]) => {
        return (results || []).map(r => ({
            resultText: r.resultText
        }));
    }

    const transformTasks = (tasks: any[]): any[] => {
        return (tasks || []).map(t => ({
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

const regenerateTaskSchema = z.object({
    originalTask: z.string(),
    userInput: z.string().optional(),
    persona: z.nativeEnum(Persona).optional().nullable(),
});

export async function handleRegenerateTask(input: RegenerateTaskInput) {
    try {
        const validatedInput = regenerateTaskSchema.parse(input);
        const result = await regenerateTask(validatedInput);
        return { success: true, newTask: result.newTask };
    } catch (error) {
        console.error("Error in handleRegenerateTask:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected response was received from the server.';
        return { success: false, error: errorMessage };
    }
}
