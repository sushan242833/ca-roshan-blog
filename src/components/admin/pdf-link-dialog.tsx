"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  ALLOWED_DOCUMENT_TYPES,
  DEFAULT_PDF_LABEL,
  MAX_DOCUMENT_SIZE_MB,
  MAX_PDF_LABEL_LENGTH,
  MAX_PDF_URL_LENGTH,
} from "@/lib/constants";
import { isValidPdfUrl, toPublicFileUrl } from "@/lib/pdf-url";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  MediaValidationError,
  useMediaUpload,
} from "@/components/admin/use-media-upload";
import MediaGridItem from "@/components/admin/media-grid-item";
import FormMessage from "@/components/ui/form-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaResponse } from "@/types/media";

interface PdfLinkDialogProps {
  /** Existing block being edited; omit to insert a new one. */
  initial?: { href: string; label: string };
  onOpenChange: (open: boolean) => void;
  onSubmit: (attributes: { href: string; label: string }) => void;
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

// Dialog for inserting or editing a PDF link block. Three ways to set the
// link: paste a URL, upload a new PDF, or pick one already in storage. All
// three fill the same URL field, and an optional label overrides the default.
export default function PdfLinkDialog({
  initial,
  onOpenChange,
  onSubmit,
}: PdfLinkDialogProps) {
  const isEditing = Boolean(initial);
  const [url, setUrl] = useState(initial?.href ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [error, setError] = useState("");
  const { authedFetch } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFile, isUploading } = useMediaUpload("document");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing PDFs in storage, so the admin can reuse one without re-uploading.
  const docsQuery = useQuery({
    queryKey: queryKeys.mediaByType("document"),
    queryFn: () => authedFetch<MediaResponse[]>("/v1/media?type=document"),
  });
  const documents = docsQuery.data ?? [];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const media = await uploadFile(file);
      // Linked through this site's /files/ path rather than the raw Cloudinary
      // URL, so published articles point at our own domain.
      setUrl(toPublicFileUrl(media.url));
      setError("");
      // Show the freshly uploaded PDF in the existing-PDFs grid immediately,
      // and refresh the unfiltered Media Library.
      queryClient.setQueryData<MediaResponse[]>(
        queryKeys.mediaByType("document"),
        (previous) => [media, ...(previous ?? [])],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.media, exact: true });
    } catch (err) {
      const message =
        err instanceof MediaValidationError || err instanceof ApiRequestError
          ? err.message
          : "Failed to upload PDF.";
      toast.error(message);
    }
  }

  function handleConfirm() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Enter a PDF URL, upload one, or pick an existing PDF.");
      return;
    }
    if (trimmedUrl.length > MAX_PDF_URL_LENGTH) {
      setError(`URL must be ${MAX_PDF_URL_LENGTH} characters or fewer.`);
      return;
    }
    if (!isValidPdfUrl(trimmedUrl)) {
      setError("Enter a valid http(s) URL or a path starting with /files/.");
      return;
    }
    onSubmit({
      // Normalised here as well as on the media-grid path, so a Cloudinary URL
      // pasted into the field by hand is stored as a /files/ link too.
      href: toPublicFileUrl(trimmedUrl),
      label: label.trim() || DEFAULT_PDF_LABEL,
    });
  }

  const docsError = docsQuery.isError
    ? docsQuery.error instanceof ApiRequestError
      ? docsQuery.error.message
      : "Failed to load PDFs."
    : "";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            {isEditing ? "Edit PDF link" : "Insert PDF link"}
          </DialogTitle>
          <DialogDescription>
            Paste a link, upload a PDF (max {MAX_DOCUMENT_SIZE_MB}MB), or pick an
            existing one. It is inserted at your cursor as a compact link.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label
            htmlFor="pdf-link-url"
            className="text-sm font-medium text-gray-700"
          >
            PDF URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="pdf-link-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError("");
              }}
              placeholder="https://… or /files/file.pdf"
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {isUploading ? (
                <Spinner size={14} />
              ) : (
                <Upload size={14} />
              )}
              {isUploading ? "Uploading…" : "Upload PDF"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_DOCUMENT_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div>
          <label
            htmlFor="pdf-link-label"
            className="text-sm font-medium text-gray-700"
          >
            Link label
          </label>
          <input
            id="pdf-link-label"
            value={label}
            maxLength={MAX_PDF_LABEL_LENGTH}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={DEFAULT_PDF_LABEL}
            className={`mt-1 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-gray-400">
            Defaults to “{DEFAULT_PDF_LABEL}”.
          </p>
        </div>

        {/* Existing PDFs — click one to fill the URL above. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Or choose an existing PDF
          </p>
          {docsError && (
            <FormMessage type="error" className="p-3" message={docsError} />
          )}
          {docsQuery.isPending ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <Spinner size={18} />
              Loading PDFs…
            </div>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No PDFs uploaded yet.
            </p>
          ) : (
            <div className="grid max-h-56 min-h-0 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {documents.map((media) => {
                const publicUrl = toPublicFileUrl(media.url);
                return (
                  <div
                    key={media.id}
                    className={
                      url === publicUrl
                        ? "rounded-md ring-2 ring-brand-teal"
                        : undefined
                    }
                  >
                    <MediaGridItem
                      media={media}
                      onClick={() => {
                        setUrl(publicUrl);
                        setError("");
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUploading}
            className="rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
          >
            {isEditing ? "Save link" : "Insert link"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
