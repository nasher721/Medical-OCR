"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOrg } from "@/lib/hooks/use-org";
import type {
  Document,
  DocumentStatus,
  ReviewComment,
  WorkflowRun,
  WorkflowRunStatus,
} from "@/lib/supabase/types";

type NotificationHandlers = {
  onIncrementUnread: () => void;
};

const workflowCompletionStatuses: WorkflowRunStatus[] = ["completed"];

const statusLabels: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported",
};

const workflowStatusLabels: Record<WorkflowRunStatus, string> = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  paused: "Paused",
};

function truncateText(text: string, maxLength = 120) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function handleDocumentUpdate(
  document: Document,
  previousStatus: DocumentStatus | null,
  { onIncrementUnread }: NotificationHandlers,
  toast: ReturnType<typeof useToast>["toast"]
) {
  if (!previousStatus || previousStatus === document.status) return;

  toast({
    title: "Document status updated",
    description: `${document.filename} moved to ${statusLabels[document.status]}.`,
  });
  onIncrementUnread();
}

function handleCommentInsert(
  comment: ReviewComment,
  { onIncrementUnread }: NotificationHandlers,
  toast: ReturnType<typeof useToast>["toast"]
) {
  toast({
    title: "New review comment",
    description: truncateText(comment.body || "A new comment was added."),
  });
  onIncrementUnread();
}

function handleWorkflowUpdate(
  run: WorkflowRun,
  previousStatus: WorkflowRunStatus | null,
  { onIncrementUnread }: NotificationHandlers,
  toast: ReturnType<typeof useToast>["toast"]
) {
  if (!previousStatus || previousStatus === run.status) return;

  if (workflowCompletionStatuses.includes(run.status)) {
    toast({
      title: "Workflow completed",
      description: run.document_id
        ? `Workflow run finished for document ${run.document_id}.`
        : "A workflow run just completed.",
    });
  } else {
    toast({
      title: "Workflow status updated",
      description: `Workflow run is now ${workflowStatusLabels[run.status]}.`,
    });
  }

  onIncrementUnread();
}

export function useRealtime() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const onIncrementUnread = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const orgId = currentOrg?.id;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`notifications:${orgId ?? "all"}`);

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "documents",
        ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}),
      },
      (payload) => {
        const document = payload.new as Document;
        const previous = payload.old as Document | null;
        handleDocumentUpdate(
          document,
          previous?.status ?? null,
          { onIncrementUnread },
          toast
        );
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "review_comments",
        ...(orgId ? { filter: `org_id=eq.${orgId}` } : {}),
      },
      (payload) => {
        handleCommentInsert(
          payload.new as ReviewComment,
          { onIncrementUnread },
          toast
        );
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "workflow_runs",
      },
      (payload) => {
        const run = payload.new as WorkflowRun;
        const previous = payload.old as WorkflowRun | null;
        handleWorkflowUpdate(
          run,
          previous?.status ?? null,
          { onIncrementUnread },
          toast
        );
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, onIncrementUnread, toast]);

  return useMemo(
    () => ({
      unreadCount,
      markAllRead,
    }),
    [markAllRead, unreadCount]
  );
}
