

export type TaskStatus = 'todo' | 'inprogress' | 'done';

export type CommentStatus = 'active' | 'accepted' | 'rejected';

export type Comment = {
  id: string;
  text: string;
  timestamp: number;
  status: CommentStatus;
  edited: boolean;
  replies: Comment[];
};

export type ExecutionResult = {
    timestamp: number;
    resultText: string;
};

export type Summary = {
    text: string;
    timestamp: number;
}

export type Task = {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  subtasks: Task[];
  lastEdited: number;
  order: number;
  parentId: string | null;
  comments: Comment[];
  executionResults?: ExecutionResult[];
  summaries?: Summary[];
  source?: 'ai' | 'manual';
};


export type Project = {
    id: string;
    name: string;
    description?: string;
    tasks: Task[];
    order: number;
    lastEdited: number;
    summaries?: Summary[];
    pinned?: boolean;
}

export type AIStep = {
  text: string;
  subtasks?: AIStep[];
}

export type SortKey = 'name' | 'completion' | 'complexity' | 'edit-date';
export type SortDirection = 'asc' | 'desc';

export type SortOption = {
    key: SortKey;
    direction: SortDirection;
};

// Persona feature removed
