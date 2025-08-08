

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Project, Task, Comment, CommentStatus } from '@/lib/types';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Plus, ChevronRight, MessageSquare, MoreHorizontal, ThumbsUp, ThumbsDown, Trash2, Edit } from 'lucide-react';
import Linkify from 'linkify-react';
import { formatDistanceToNow } from 'date-fns';
import { findTaskPath } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';


type CommentWithContext = {
  comment: Comment;
  task: Task;
  path: Task[];
};

type CommentsViewProps = {
  project: Project;
  activeTask?: Task;
  onAddComment: (projectId: string, taskId: string, commentText: string) => boolean;
  onAddReply: (projectId: string, taskId: string, parentCommentId: string, replyText: string) => boolean;
  onUpdateComment: (projectId: string, taskId: string, commentId: string, newText?: string, newStatus?: CommentStatus) => boolean;
  onDeleteComment: (projectId: string, taskId: string, commentId:string) => boolean;
  onItemSelect: (taskId: string) => void;
};

const statusColors: Record<CommentStatus, string> = {
    active: 'border-transparent',
    accepted: 'border-green-500',
    rejected: 'border-red-500'
}

const statusIcons: Record<CommentStatus, React.ReactNode> = {
    active: null,
    accepted: <ThumbsUp className="h-4 w-4 text-green-500" />,
    rejected: <ThumbsDown className="h-4 w-4 text-red-500" />
}

const CommentCard = ({
    comment,
    task,
    project,
    level,
    onAddReply,
    onUpdateComment,
    onDeleteComment
}: {
    comment: Comment,
    task: Task,
    project: Project,
    level: number,
    onAddReply: (projectId: string, taskId: string, parentCommentId: string, replyText: string) => boolean,
    onUpdateComment: (projectId: string, taskId: string, commentId: string, newText?: string, newStatus?: CommentStatus) => boolean;
    onDeleteComment: (projectId: string, taskId: string, commentId:string) => boolean;
}) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [editedText, setEditedText] = useState(comment.text);

    const handleSaveEdit = () => {
        if (editedText.trim() && editedText.trim() !== comment.text) {
            onUpdateComment(project.id, task.id, comment.id, editedText.trim());
        }
        setIsEditing(false);
    };

    const handleSaveReply = () => {
        if (replyText.trim()) {
            onAddReply(project.id, task.id, comment.id, replyText.trim());
            setReplyText('');
            setIsReplying(false);
        }
    };
    
    return (
        <div className={cn("p-3 rounded-md text-sm border-l-2", statusColors[comment.status])} style={{marginLeft: `${level * 20}px`}}>
            <div className="flex justify-between items-start">
                {isEditing ? (
                    <div className="flex-grow space-y-2">
                        <Textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={2} className="w-full" />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap break-words flex-grow">
                        <Linkify as="span" options={{ target: '_blank', className: 'text-primary underline' }}>
                            {comment.text}
                        </Linkify>
                    </p>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setIsReplying(true)}><MessageSquare className="mr-2"/>Reply</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}><Edit className="mr-2"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateComment(project.id, task.id, comment.id, undefined, 'accepted')}><ThumbsUp className="mr-2"/>Accept</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateComment(project.id, task.id, comment.id, undefined, 'rejected')}><ThumbsDown className="mr-2"/>Reject</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDeleteComment(project.id, task.id, comment.id)}><Trash2 className="mr-2"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
             <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <span>{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}</span>
                {comment.edited && <span>(edited)</span>}
                {statusIcons[comment.status]}
            </div>

            {isReplying && (
                <div className="mt-2 flex gap-2">
                    <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." rows={1} />
                    <Button size="sm" onClick={handleSaveReply}>Reply</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>Cancel</Button>
                </div>
            )}
            
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                    {comment.replies.map(reply => (
                        <CommentCard 
                            key={reply.id} 
                            comment={reply} 
                            task={task} 
                            project={project} 
                            level={level + 1}
                            onAddReply={onAddReply}
                            onUpdateComment={onUpdateComment}
                            onDeleteComment={onDeleteComment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function CommentsView({
  project,
  activeTask,
  onAddComment,
  onAddReply,
  onUpdateComment,
  onDeleteComment,
  onItemSelect
}: CommentsViewProps) {
  const [newComment, setNewComment] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
      setNewComment('');
      if (activeTask) {
        commentInputRef.current?.focus();
      }
  }, [activeTask]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTask && newComment.trim()) {
      onAddComment(project.id, activeTask.id, newComment.trim());
      setNewComment('');
    }
  };

  const allCommentsWithContext: CommentWithContext[] = useMemo(() => {
    const comments: CommentWithContext[] = [];
    const findCommentsRecursive = (tasks: Task[]) => {
      for (const task of tasks) {
        if (task.comments && task.comments.length > 0) {
          const path = findTaskPath(project.tasks, task.id);
          for (const comment of task.comments) {
            comments.push({ comment, task, path });
          }
        }
        if (task.subtasks) {
          findCommentsRecursive(task.subtasks);
        }
      }
    };
    findCommentsRecursive(project.tasks);
    return comments.sort((a, b) => b.comment.timestamp - a.comment.timestamp);
  }, [project.tasks]);


  const CommentBreadcrumb = ({ path, onSelectTask }: { path: Task[], onSelectTask: (taskId: string) => void }) => {
    return (
        <div className="flex items-center text-xs text-muted-foreground mb-1">
            {path.map((task, index) => (
                <div key={task.id} className="flex items-center">
                    <button onClick={() => onSelectTask(task.id)} className="hover:underline truncate max-w-[150px]">{task.text}</button>
                    {index < path.length - 1 && <ChevronRight className="h-3 w-3 mx-1 shrink-0" />}
                </div>
            ))}
        </div>
    )
  }

  return (
    <div className="p-4 bg-card rounded-lg border max-w-4xl mx-auto">
      <h3 className="font-semibold text-lg mb-4">Comments on "{project.name}"</h3>
        
      {activeTask && (
        <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
          <Textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Comment on "${activeTask.text}"...`}
            rows={2}
          />
          <Button type="submit" size="icon" disabled={!newComment.trim()}>
            <Plus />
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {allCommentsWithContext.length > 0 ? (
          allCommentsWithContext.map(({ comment, task, path }) => (
            <div key={comment.id} className="bg-background/50 p-3 rounded-md">
                <CommentBreadcrumb path={path} onSelectTask={onItemSelect} />
                <CommentCard 
                    comment={comment}
                    task={task}
                    project={project}
                    level={0}
                    onAddReply={onAddReply}
                    onUpdateComment={onUpdateComment}
                    onDeleteComment={onDeleteComment}
                />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-4">No comments in this folder yet.</p>
        )}
      </div>
    </div>
  );
}

