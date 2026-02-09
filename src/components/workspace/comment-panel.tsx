import { useState, useEffect, useCallback } from 'react';
import { CommentService } from '@/lib/services/comment-service';
import { ReviewComment } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CommentWithUser extends ReviewComment {
    user: {
        display_name: string;
        avatar_url: string | null;
    } | null;
}

interface CommentPanelProps {
    documentId: string | null;
    orgId: string;
}

export function CommentPanel({ documentId, orgId }: CommentPanelProps) {
    const [comments, setComments] = useState<CommentWithUser[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        if (!documentId) return;
        setLoading(true);
        try {
            const data = await CommentService.list(documentId);
            setComments(data as CommentWithUser[]);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        if (documentId) {
            fetchComments();
        } else {
            setComments([]);
        }
    }, [documentId, fetchComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentId || !newComment.trim()) return;

        setSubmitting(true);
        try {
            await CommentService.create(documentId, orgId, newComment);
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Failed to post comment', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!documentId) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                <p>Select a document to view comments</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                    <div className="h-16 w-full bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No comments yet. Start the discussion!
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 text-sm group">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user?.avatar_url || ''} />
                                <AvatarFallback>{comment.user?.display_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{comment.user?.display_name || 'Unknown User'}</span>
                                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                                </div>
                                <div className="text-foreground/90 whitespace-pre-wrap rounded-md bg-muted/30 p-2">
                                    {comment.body}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full min-h-[80px] rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none pr-10"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="absolute bottom-3 right-3 p-1.5 rounded-full text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                <div className="mt-1 text-[10px] text-muted-foreground text-right">
                    Press <kbd className="font-mono">Enter</kbd> to send
                </div>
            </div>
        </div>
    );
}
