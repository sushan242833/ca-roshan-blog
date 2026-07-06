"use client";

import { useRef, useState } from "react";
import mammoth from "mammoth";
import { FileUp, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useMediaUpload } from "@/components/admin/use-media-upload";

// Word .docx files with embedded images can get large; guard well above a
// typical article but below anything that would choke the browser.
const MAX_DOCX_SIZE_MB = 20;

// Word stores images in formats the media endpoint accepts (png/jpeg) plus
// some it does not (emf/wmf). Map the ones we can upload to a file extension;
// anything else is left to fail the shared upload validation and be reported.
const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface WordImportResult {
  /** Text of a leading H1, extracted for the title field (else null). */
  title: string | null;
  /** Converted, image-rewritten HTML with the leading H1 removed. */
  html: string;
}

interface WordImportProps {
  /** Called once conversion + image uploads finish and produce content. */
  onImport: (result: WordImportResult) => void;
  /** Whether the editor already holds content worth an overwrite warning. */
  hasExistingContent: () => boolean;
}

// Build an uploadable File from mammoth's raw image bytes so it flows through
// the exact same /v1/media/upload path as every other image in the app.
function imageToFile(
  bytes: ArrayBuffer,
  contentType: string,
  index: number,
): File {
  const ext = MIME_EXTENSION[contentType] ?? "bin";
  return new File([bytes], `word-image-${index}.${ext}`, {
    type: contentType,
  });
}

// Pull a leading H1 into the title and drop it from the body so it is not
// duplicated in the article. Only a *leading* H1 is treated as the title.
function splitLeadingTitle(html: string): WordImportResult {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const first = doc.body.firstElementChild;
  if (first && first.tagName === "H1") {
    const title = first.textContent?.trim() ?? "";
    first.remove();
    return { title: title || null, html: doc.body.innerHTML };
  }
  return { title: null, html };
}

export default function WordImport({
  onImport,
  hasExistingContent,
}: WordImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useMediaUpload();
  const [isImporting, setIsImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleFile(file: File) {
    setWarnings([]);

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please choose a Word .docx file.");
      return;
    }
    if (file.size > MAX_DOCX_SIZE_MB * 1024 * 1024) {
      toast.error(
        `That document is over ${MAX_DOCX_SIZE_MB}MB. Please split it or reduce embedded images.`,
      );
      return;
    }
    if (
      hasExistingContent() &&
      !window.confirm(
        "This will replace your current draft content. Continue?",
      )
    ) {
      return;
    }

    setIsImporting(true);
    const failedImages: string[] = [];
    let imageIndex = 0;

    // Each embedded image is uploaded through the shared media hook and its
    // returned URL used as the src — never a base64 data URI in post content.
    const convertImage = mammoth.images.imgElement(async (image) => {
      imageIndex += 1;
      const currentIndex = imageIndex;
      try {
        const bytes = await image.readAsArrayBuffer();
        const media = await uploadFile(
          imageToFile(bytes, image.contentType, currentIndex),
        );
        return { src: media.url };
      } catch {
        // Don't abort the whole import for one bad image (e.g. an unsupported
        // emf/wmf format); leave an empty src and report it.
        failedImages.push(`image ${currentIndex}`);
        return { src: "" };
      }
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value, messages } = await mammoth.convertToHtml(
        { arrayBuffer },
        { convertImage },
      );

      const result = splitLeadingTitle(value);

      const notices = messages
        .filter((m) => m.type === "warning" || m.type === "error")
        .map((m) => m.message);
      if (failedImages.length > 0) {
        notices.push(
          `${failedImages.length} image(s) could not be uploaded and were skipped (unsupported format).`,
        );
      }
      setWarnings(notices);

      onImport(result);
      toast.success("Document imported. Review the draft below.");
    } catch {
      toast.error(
        "Could not read that document. Make sure it is a valid Word .docx file.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-base font-bold text-brand-navy">
            Import from Word
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Works best when your Word document uses Word&apos;s built-in Heading
            styles (Heading 1, Heading 2) rather than manually bolded text.
            Images and tables are imported automatically; please review
            formatting after import.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isImporting}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {isImporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileUp size={16} />
          )}
          {isImporting ? "Importing…" : "Import from Word"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so selecting the same file again re-triggers onChange.
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>

      {isImporting && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Converting document and uploading images…
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {warnings.length} item(s) could not be converted automatically
                  — please review the imported draft below.
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-700">
                  {warnings.slice(0, 8).map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                  {warnings.length > 8 && (
                    <li>…and {warnings.length - 8} more.</li>
                  )}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWarnings([])}
              aria-label="Dismiss warnings"
              className="shrink-0 rounded p-1 text-amber-600 transition-colors hover:bg-amber-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const cardClass = "rounded-lg border border-gray-200 bg-white p-5";
