"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublishPostDialogProps {
  postTitle: string;
  /**
   * The backend queues the newsletter only for DRAFT → PUBLISHED;
   * re-publishing an archived post does not email subscribers.
   */
  showNewsletterWarning: boolean;
  onOpenChange: (open: boolean) => void;
  /** Performs the publish; the caller closes the dialog on success. */
  onConfirm: () => Promise<void>;
}

// Shared publish confirmation for the Manage Posts list and the post editor.
export default function PublishPostDialog({
  postTitle,
  showNewsletterWarning,
  onOpenChange,
  onConfirm,
}: PublishPostDialogProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  async function handleConfirm() {
    setIsPublishing(true);
    try {
      await onConfirm();
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            Publish post?
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-brand-navy">{postTitle}</span>{" "}
            will be publicly visible on the blog immediately.
          </DialogDescription>
        </DialogHeader>

        {showNewsletterWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            Publishing this draft will queue the newsletter announcement to all
            active subscribers.
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isPublishing}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
          >
            {isPublishing && <Loader2 size={16} className="animate-spin" />}
            {isPublishing ? "Publishing…" : "Publish Post"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
