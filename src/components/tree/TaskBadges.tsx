'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TaskBadgesProps {
  taskId: string;
  recentlyChanged?: Record<string, { kind: 'new' | 'updated'; at: number }>;
  className?: string;
}

export function TaskBadges({
  taskId,
  recentlyChanged,
  className = ''
}: TaskBadgesProps) {
  const changeInfo = recentlyChanged?.[taskId];
  
  if (!changeInfo) return null;

  return (
    <span className={`ml-2 flex items-center ${className}`}>
      <Badge 
        className="leading-none py-0.5" 
        variant={changeInfo.kind === 'new' ? 'default' : 'secondary'}
      >
        {changeInfo.kind === 'new' ? 'New' : 'Updated'}
      </Badge>
    </span>
  );
}