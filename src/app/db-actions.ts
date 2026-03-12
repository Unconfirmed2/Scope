'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Project as AppProject } from '@/lib/types';

async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as Record<string, unknown>)?.id as string ?? null;
}

/** Load all projects for the current user from the database */
export async function loadProjects(): Promise<{ success: boolean; projects?: AppProject[]; error?: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  try {
    const rows = await prisma.project.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    const projects: AppProject[] = rows.map((row) => {
      const data = row.data as Record<string, unknown>;
      return {
        id: row.id,
        name: row.name,
        description: (data.description as string) || '',
        tasks: (data.tasks as AppProject['tasks']) || [],
        order: row.order,
        lastEdited: (data.lastEdited as number) || row.updatedAt.getTime(),
        summaries: (data.summaries as AppProject['summaries']) || [],
        pinned: row.pinned,
      };
    });

    return { success: true, projects };
  } catch (error) {
    console.error('loadProjects error:', error);
    return { success: false, error: 'Failed to load projects' };
  }
}

/** Save all projects for the current user (full replace) */
export async function saveProjects(projects: AppProject[]): Promise<{ success: boolean; error?: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  try {
    // Use a transaction to replace all projects atomically
    await prisma.$transaction(async (tx) => {
      // Get existing project IDs
      const existing = await tx.project.findMany({
        where: { userId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((p) => p.id));
      const incomingIds = new Set(projects.map((p) => p.id));

      // Delete projects that no longer exist
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.project.deleteMany({
          where: { id: { in: toDelete }, userId },
        });
      }

      // Upsert each project
      for (const project of projects) {
        const data = {
          description: project.description,
          tasks: project.tasks,
          lastEdited: project.lastEdited,
          summaries: project.summaries || [],
        };

        await tx.project.upsert({
          where: { id: project.id },
          create: {
            id: project.id,
            userId,
            name: project.name,
            data,
            pinned: project.pinned || false,
            order: project.order,
          },
          update: {
            name: project.name,
            data,
            pinned: project.pinned || false,
            order: project.order,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('saveProjects error:', error);
    return { success: false, error: 'Failed to save projects' };
  }
}

/** Update user profile (name, image) */
export async function updateProfile(name: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return { success: true };
  } catch (error) {
    console.error('updateProfile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

/** Update user password */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { success: true };
  } catch (error) {
    console.error('updatePassword error:', error);
    return { success: false, error: 'Failed to update password' };
  }
}
