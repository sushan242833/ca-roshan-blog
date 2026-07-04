"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/constants";
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
}

// Media chooser shared by the post editor's featured-image field; built to be
// reused by the Media Library screen in the next phase.
export default function MediaPickerDialog({
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) {
  const { authedFetch, authedUpload } = useAuth();
  const [items, setItems] = useState<MediaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await authedFetch<MediaResponse[]>("/v1/media");
        if (cancelled) return;
        setItems(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load media.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const media = await authedUpload<MediaResponse>(
        "/v1/media/upload",
        formData,
      );
      onSelect(media);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to upload image.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            Select Featured Image
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
            onChange={(event) => {
              void handleUpload(event);
            }}
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
              <button
                key={media.id}
                type="button"
                onClick={() => onSelect(media)}
                className="group overflow-hidden rounded-md border border-gray-200 text-left transition-colors hover:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                <div className="relative aspect-square w-full bg-gray-100">
                  <Image
                    src={media.url}
                    alt={media.originalName}
                    fill
                    sizes="(max-width: 640px) 50vw, 160px"
                    className="object-cover"
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-xs text-gray-500 group-hover:text-brand-navy">
                  {media.originalName}
                </p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
