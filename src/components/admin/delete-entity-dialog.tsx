"use client";

import { useState, type ReactNode } from "react";
import { Ban, TriangleAlert } from "lucide-react";
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
  warning?: string | null;
  blockedReason?: ReactNode;
  isChecking?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

// Shared delete confirmation dialog for admin entities.
export default function DeleteEntityDialog({
  entityLabel,
  entityName,
  warning,
  blockedReason,
  isChecking = false,
  onOpenChange,
  onConfirm,
}: DeleteEntityDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const isBlocked = Boolean(blockedReason);

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
            {isBlocked ? (
              <>
                <span className="font-semibold text-brand-navy">
                  {entityName}
                </span>{" "}
                cannot be deleted right now.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-brand-navy">
                  {entityName}
                </span>
                ? This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isChecking && (
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
            <Spinner size={16} />
            Checking whether this can be deleted…
          </div>
        )}

        {isBlocked ? (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <Ban size={16} className="mt-0.5 shrink-0" />
            <div>{blockedReason}</div>
          </div>
        ) : (
          warning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {warning}
            </div>
          )
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {isBlocked ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isDeleting || isChecking || isBlocked}
            title={
              isBlocked
                ? `This ${entityLabel.toLowerCase()} is in use and cannot be deleted.`
                : undefined
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && <Spinner size={16} />}
            {isDeleting ? "Deleting…" : `Delete ${entityLabel}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
