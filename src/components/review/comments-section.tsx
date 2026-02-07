'use client';

import { useState } from 'react';
import type { ReviewComment } from '@/lib/supabase/types';
import { Send } from 'lucide-react';

interface CommentsSectionProps {
  comments: ReviewComment[];
  onAddComment: (body: string) => Promise<void>;
}

export function CommentsSection({ comments, onAddComment }: CommentsSectionProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    await onAddComment(body.trim());
    setBody('');
    setSubmitting(false);
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Comments</h3>
      <div className="mb-3 max-h-48 space-y-2 overflow-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-muted/50 p-2">
              <p className="text-sm">{c.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
