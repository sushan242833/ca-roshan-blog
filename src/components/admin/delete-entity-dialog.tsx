"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteEntityDialogProps {
  entityLabel: string;
  entityName: string;
  /** Extra caution line, e.g. when a category still has published posts. */
  warning?: string | null;
  onOpenChange: (open: boolean) => void;
  /** Performs the delete; the caller closes the dialog on success. */
  onConfirm: () => Promise<void>;
}

// Shared delete confirmation dialog for admin entities.
export default function DeleteEntityDialog({
  entityLabel,
  entityName,
  warning,
  onOpenChange,
  onConfirm,
}: DeleteEntityDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            Delete {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-brand-navy">{entityName}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {warning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            {warning}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting && <Spinner size={16} />}
            {isDeleting ? "Deleting…" : `Delete ${entityLabel}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
