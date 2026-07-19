"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
} from "@/lib/constants";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import MediaGridItem from "@/components/admin/media-grid-item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaKind, MediaResponse } from "@/types/media";

interface MediaPickerDialogProps {
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen (or freshly uploaded) media; caller closes. */
  onSelect: (media: MediaResponse) => void;
  /** Dialog heading; defaults to the featured-image wording. */
  title?: string;
  /**
   * Which media kind this picker deals with. "image" (default) keeps every
   * existing usage unchanged; "document" restricts uploads to PDFs, filters
   * the list to documents, and updates the accept attribute + wording.
   */
  mediaType?: MediaKind;
}

// Media chooser for the post editor's featured-image field and inline
// editor images. Upload and grid rendering are shared with the Media
// Library (use-media-upload, media-grid-item).
export default function MediaPickerDialog({
  onOpenChange,
  onSelect,
  title = "Select Featured Image",
  mediaType = "image",
}: MediaPickerDialogProps) {
  const { authedFetch } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useMediaUpload(mediaType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDocument = mediaType === "document";
  const acceptTypes = isDocument ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES;
  const listKey = isDocument ? queryKeys.mediaByType("document") : queryKeys.media;
  const listPath = isDocument ? "/v1/media?type=document" : "/v1/media";

  // Same ["media"] key as the Media Library for images, so uploads here appear
  // there (and vice versa) with no reload; a separate key for the document
  // filter keeps the two lists from clobbering each other in the cache.
  const mediaQuery = useQuery({
    queryKey: listKey,
    queryFn: () => authedFetch<MediaResponse[]>(listPath),
  });

  const items = mediaQuery.data ?? [];
  const isLoading = mediaQuery.isPending;
  const error = mediaQuery.isError
    ? mediaQuery.error instanceof ApiRequestError
      ? mediaQuery.error.message
      : "Failed to load media."
    : "";

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // A fresh upload is prepended to the list this picker shows and
    // auto-selected. Documents also live in the unfiltered Media Library, so
    // invalidate that cache to keep it in sync.
    void uploadFiles([file], (media) => {
      queryClient.setQueryData<MediaResponse[]>(listKey, (previous) => [
        media,
        ...(previous ?? []),
      ]);
      if (isDocument) {
        queryClient.invalidateQueries({ queryKey: queryKeys.media });
      }
      onSelect(media);
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* Flex column capped at 85vh so the header/upload stay put and only the
          media grid scrolls, instead of the dialog growing past the viewport. */}
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            {title}
          </DialogTitle>
          <DialogDescription>
            {isDocument
              ? `Pick an existing PDF or upload a new one (max ${MAX_DOCUMENT_SIZE_MB}MB).`
              : `Pick an existing image or upload a new one (PNG, JPG, WEBP — max ${MAX_IMAGE_SIZE_MB}MB).`}
          </DialogDescription>
        </DialogHeader>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 py-3 text-sm text-gray-500 transition-colors hover:border-brand-teal hover:text-brand-teal disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {isUploading
              ? "Uploading…"
              : isDocument
                ? "Upload new PDF"
                : "Upload new image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            Loading media…
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            {isDocument
              ? "No PDFs uploaded yet."
              : "No media uploaded yet."}
          </p>
        ) : (
          // min-h-0 lets this scroll area shrink below its content so flex-1 +
          // overflow-y-auto actually scroll inside the capped dialog.
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {items.map((media) => (
              <MediaGridItem
                key={media.id}
                media={media}
                onClick={() => onSelect(media)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
