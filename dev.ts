
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-task-steps.ts';
import '@/ai/flows/generate-project-description.ts';
import '@/ai/flows/generate-project-summary.ts';
import '@/ai/flows/execute-task.ts';
import '@/ai/flows/regenerate-task.ts';
