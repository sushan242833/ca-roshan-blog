"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_DOCUMENT_TYPES,
  DEFAULT_PDF_LABEL,
  MAX_DOCUMENT_SIZE_MB,
  MAX_PDF_LABEL_LENGTH,
  MAX_PDF_URL_LENGTH,
} from "@/lib/constants";
import { isValidPdfUrl } from "@/lib/pdf-url";
import { ApiRequestError } from "@/lib/api";
import {
  MediaValidationError,
  useMediaUpload,
} from "@/components/admin/use-media-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PdfLinkDialogProps {
  /** Existing block being edited; omit to insert a new one. */
  initial?: { href: string; label: string };
  onOpenChange: (open: boolean) => void;
  onSubmit: (attributes: { href: string; label: string }) => void;
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

// Small dialog for inserting or editing a PDF link block. Offers a URL field
// (paste an external link or a self-hosted /uploads/ path) and an "Upload PDF"
// button that reuses the shared media upload flow restricted to application/pdf.
export default function PdfLinkDialog({
  initial,
  onOpenChange,
  onSubmit,
}: PdfLinkDialogProps) {
  const isEditing = Boolean(initial);
  const [url, setUrl] = useState(initial?.href ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [error, setError] = useState("");
  const { uploadFile, isUploading } = useMediaUpload("document");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const media = await uploadFile(file);
      setUrl(media.url);
      setError("");
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
      setError("Enter a PDF URL or upload a file.");
      return;
    }
    if (trimmedUrl.length > MAX_PDF_URL_LENGTH) {
      setError(`URL must be ${MAX_PDF_URL_LENGTH} characters or fewer.`);
      return;
    }
    if (!isValidPdfUrl(trimmedUrl)) {
      setError("Enter a valid http(s) URL or a path starting with /uploads/.");
      return;
    }
    onSubmit({
      href: trimmedUrl,
      label: label.trim() || DEFAULT_PDF_LABEL,
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-brand-navy">
            {isEditing ? "Edit PDF link" : "Insert PDF link"}
          </DialogTitle>
          <DialogDescription>
            Paste a link or upload a PDF (max {MAX_DOCUMENT_SIZE_MB}MB). It is
            inserted at your cursor as a compact link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                placeholder="https://… or /uploads/file.pdf"
                className={`min-w-0 flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin" />
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
