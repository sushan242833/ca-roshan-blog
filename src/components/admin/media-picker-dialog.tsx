"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/constants";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import MediaGridItem from "@/components/admin/media-grid-item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaResponse } from "@/types/media";

interface MediaPickerDialogProps {
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen (or freshly uploaded) media; caller closes. */
  onSelect: (media: MediaResponse) => void;
  /** Dialog heading; defaults to the featured-image wording. */
  title?: string;
}

// Media chooser for the post editor's featured-image field and inline
// editor images. Upload and grid rendering are shared with the Media
// Library (use-media-upload, media-grid-item).
export default function MediaPickerDialog({
  onOpenChange,
  onSelect,
  title = "Select Featured Image",
}: MediaPickerDialogProps) {
  const { authedFetch } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Same ["media"] key as the Media Library, so uploads here appear there
  // (and vice versa) with no reload.
  const mediaQuery = useQuery({
    queryKey: queryKeys.media,
    queryFn: () => authedFetch<MediaResponse[]>("/v1/media"),
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
    // A fresh upload is prepended to the shared ["media"] cache (so it also
    // lands in the Media Library) and auto-selected as the featured image.
    void uploadFiles([file], (media) => {
      queryClient.setQueryData<MediaResponse[]>(queryKeys.media, (previous) => [
        media,
        ...(previous ?? []),
      ]);
      onSelect(media);
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            {title}
          </DialogTitle>
          <DialogDescription>
            Pick an existing image or upload a new one (PNG, JPG, WEBP — max{" "}
            {MAX_IMAGE_SIZE_MB}MB).
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
            {isUploading ? "Uploading…" : "Upload new image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
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
            No media uploaded yet.
          </p>
        ) : (
          <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
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
