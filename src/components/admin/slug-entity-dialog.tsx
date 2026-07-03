"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiRequestError } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SlugEntityFormValues {
  name: string;
  slug?: string;
}

interface SlugEntityDialogProps {
  entityLabel: string;
  nameMaxLength: number;
  /** Pre-filled values when editing; null when creating. */
  initialValues: { name: string; slug: string } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SlugEntityFormValues) => Promise<void>;
}

// Shared create/edit dialog for slug-based entities (categories, tags) — the
// frontend counterpart of the backend's SlugEntityService.
export default function SlugEntityDialog({
  entityLabel,
  nameMaxLength,
  initialValues,
  onOpenChange,
  onSubmit,
}: SlugEntityDialogProps) {
  const isEdit = initialValues !== null;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      return;
    }
    setNameError("");
    setServerError("");

    const trimmedSlug = slug.trim();
    setIsSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        ...(trimmedSlug ? { slug: trimmedSlug } : {}),
      });
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to save ${entityLabel.toLowerCase()}.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            {isEdit ? `Edit ${entityLabel}` : `New ${entityLabel}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update the ${entityLabel.toLowerCase()} name or slug.`
              : `Add a new ${entityLabel.toLowerCase()} to organize your content.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <div>
            <label
              htmlFor="slug-entity-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="slug-entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={nameMaxLength}
              placeholder={`e.g. ${entityLabel === "Tag" ? "Capital Gains" : "Taxation"}`}
              aria-invalid={nameError ? true : undefined}
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal ${
                nameError ? "border-red-400" : "border-gray-300"
              }`}
            />
            {nameError ? (
              <p className="mt-1 text-xs text-red-600">{nameError}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                The name is how it appears on your site.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="slug-entity-slug"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Slug
            </label>
            <input
              id="slug-entity-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={`e.g. ${entityLabel === "Tag" ? "capital-gains" : "taxation"}`}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave blank to auto-generate from name.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : `Create ${entityLabel}`}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
