"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/constants";
import type { MediaResponse } from "@/types/media";

// Client-side pre-check mirroring the backend's upload rules; returns a
// user-facing error message, or null when the file is acceptable.
export function validateMediaFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name}: only PNG, JPG, or WEBP images are allowed.`;
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `${file.name}: image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`;
  }
  return null;
}

interface UploadProgress {
  current: number;
  total: number;
}

// Upload logic shared by the media picker dialog and the Media Library.
// Invalid files are rejected client-side with a toast (no request sent);
// valid files upload sequentially — the endpoint takes one file per request.
export function useMediaUpload() {
  const { authedUpload } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  async function uploadFiles(
    files: File[],
    onUploaded: (media: MediaResponse) => void,
  ): Promise<void> {
    const validFiles: File[] = [];
    for (const file of files) {
      const validationError = validateMediaFile(file);
      if (validationError) {
        toast.error(validationError);
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      let current = 0;
      for (const file of validFiles) {
        current += 1;
        setProgress({ current, total: validFiles.length });
        try {
          const formData = new FormData();
          formData.append("file", file);
          const media = await authedUpload<MediaResponse>(
            "/v1/media/upload",
            formData,
          );
          onUploaded(media);
        } catch (err) {
          toast.error(
            err instanceof ApiRequestError
              ? `${file.name}: ${err.message}`
              : `Failed to upload ${file.name}.`,
          );
        }
      }
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  }

  return { uploadFiles, isUploading, progress };
}
