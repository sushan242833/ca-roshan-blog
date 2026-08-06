"use client";

import { useRef, useState } from "react";
import mammoth from "mammoth";
import { FileUp, Info, X } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import {
  applyImportedColors,
  tagColoredRuns,
  WORD_COLOR_STYLE_MAP,
} from "@/lib/word-color-import";
import {
  applyWordNumbering,
  markWordOrderedLists,
} from "@/lib/word-numbering-import";

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

// The editor's schema only supports headings h2–h4. Word documents use
// Heading 1+ (and may skip levels), so shift every heading into [2, 4],
// preserving relative hierarchy, rather than letting ProseMirror silently
// drop levels it doesn't recognize (which reduces them to plain paragraphs).
const MIN_HEADING_LEVEL = 2;
const MAX_HEADING_LEVEL = 4;

function remapHeadingLevels(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = Array.from(doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  if (headings.length === 0) return html;

  const levelOf = (el: Element) => parseInt(el.tagName.substring(1), 10);
  const minLevel = Math.min(...headings.map(levelOf));
  const shift = MIN_HEADING_LEVEL - minLevel;

  headings.forEach((el) => {
    const newLevel = Math.min(
      MAX_HEADING_LEVEL,
      Math.max(MIN_HEADING_LEVEL, levelOf(el) + shift),
    );
    const replacement = doc.createElement(`h${newLevel}`);
    while (el.firstChild) replacement.appendChild(el.firstChild);
    Array.from(el.attributes).forEach((attr) =>
      replacement.setAttribute(attr.name, attr.value),
    );
    el.replaceWith(replacement);
  });

  return doc.body.innerHTML;
}

// Word's own auto-generated Table of Contents is redundant — this platform
// builds its own TOC from headings — so its paragraphs (styled "TOC Heading",
// "toc 1", "toc 2", etc., Style IDs "TOCHeading"/"TOC1"/"TOC2"...) are dropped
// entirely from the converted document, not just hidden from the warning
// list, since leaving them produces broken-looking duplicate text in the
// draft.
const TOC_STYLE_ID_PATTERN = /^(TOC\d*|TOCHeading)$/i;

// mammoth exposes no type for its document elements (Options.transformDocument
// is typed `(element: any) => any`), so `any` is unavoidable here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripTocParagraphs(element: any): any {
  if (element.children) {
    const kept = element.children
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child: any) =>
          !(
            child.type === "paragraph" &&
            child.styleId &&
            TOC_STYLE_ID_PATTERN.test(child.styleId)
          ),
      )
      .map(stripTocParagraphs);
    return { ...element, children: kept };
  }
  return element;
}

// Style IDs mammoth leaves unmapped but which are common and harmless — e.g.
// "List Paragraph" is often used purely for indentation, not as a real list —
// so they should not alarm a non-technical admin.
const BENIGN_UNMAPPED_STYLE_IDS = new Set(["ListParagraph"]);

function isBenignStyleWarning(message: string): boolean {
  const match = /Style ID: ([^)]+)\)/.exec(message);
  return !!match && BENIGN_UNMAPPED_STYLE_IDS.has(match[1]);
}

// VML is Word's legacy vector-drawing markup (v:line, v:oval, v:shape, etc.) —
// genuinely not convertible (it's drawing instructions, not an embeddable
// image), so surface ONE plain-language message instead of raw XML tag names.
function isVmlWarning(message: string): boolean {
  return /unrecogni[sz]ed element was ignored: v:/i.test(message);
}

const VML_USER_MESSAGE =
  "One or more drawn graphics (shapes created directly in Word, not " +
  "inserted pictures) could not be imported. Please replace them with " +
  "an inserted image file (Word's Insert > Pictures) and re-import, or " +
  "add the image directly in the editor below.";

function humanizeMammothMessages(
  messages: { type: string; message: string }[],
): string[] {
  let hasVmlWarning = false;
  const notices: string[] = [];
  for (const m of messages) {
    if (m.type !== "warning" && m.type !== "error") continue;
    if (isVmlWarning(m.message)) {
      hasVmlWarning = true;
      continue;
    }
    if (isBenignStyleWarning(m.message)) continue;
    notices.push(m.message);
  }
  if (hasVmlWarning) notices.unshift(VML_USER_MESSAGE);
  return notices;
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
      !window.confirm("This will replace your current draft content. Continue?")
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
      // Two rewrites of the .docx before mammoth sees it, each recovering
      // something mammoth reads too shallowly. Ordered list items get their
      // Word-rendered label — (a), (b), (iv) — written in as text, because
      // mammoth keeps only "this is an <ol>". Coloured runs then get a character
      // style, because mammoth discards a run's font colour. They touch
      // different parts of the paragraph, so the order between them is free.
      //
      // Blank paragraphs are deliberately NOT preserved: mammoth drops a
      // run-less paragraph, so the empty lines an author left in Word do not
      // come through, and spacing is left to the article stylesheet.
      const arrayBuffer = await tagColoredRuns(
        await applyWordNumbering(await file.arrayBuffer()),
      );
      const { value, messages } = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage,
          transformDocument: stripTocParagraphs,
          styleMap: WORD_COLOR_STYLE_MAP,
        },
      );

      // Extract the leading H1 title BEFORE remapping — the split checks for a
      // genuine leading <h1>, which remapping would turn into an <h2> first.
      const titleSplit = splitLeadingTitle(
        markWordOrderedLists(applyImportedColors(value)),
      );
      const result = {
        title: titleSplit.title,
        html: remapHeadingLevels(titleSplit.html),
      };

      const notices = humanizeMammothMessages(messages);
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
            Images and tables are imported automatically. Red and blue text and
            highlighted text carry over, mapped onto this editor&apos;s own
            colours; other colours are imported as plain text. Please review
            formatting after import.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isImporting}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {isImporting ? <Spinner size={16} /> : <FileUp size={16} />}
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
          <Spinner size={14} />
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
