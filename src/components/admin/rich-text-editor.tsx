"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TiptapImage from "@tiptap/extension-image";
import {
  Bold,
  Captions,
  FileText,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  SquareX,
  Table as TableIcon,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import MediaPickerDialog from "@/components/admin/media-picker-dialog";
import PdfLinkDialog from "@/components/admin/pdf-link-dialog";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import { ImageUpload } from "@/lib/tiptap/image-upload-extension";
import { Callout } from "@/lib/tiptap/callout-extension";
import { PdfLink } from "@/lib/tiptap/pdf-link-extension";
import { DEFAULT_PDF_LABEL } from "@/lib/constants";
import type { MediaResponse } from "@/types/media";

interface RichTextEditorProps {
  /** HTML string, e.g. from react-hook-form's Controller. */
  value: string;
  onChange: (html: string) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  label,
  active = false,
  disabled = false,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      // Keep focus (and thus the selection) inside the editor on click.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-brand-teal/10 text-brand-teal"
          : "text-gray-500 hover:bg-gray-100 hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

interface TableMenuButtonProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}

// Compact text button for the contextual table controls row.
function TableMenuButton({
  onClick,
  active = false,
  children,
}: TableMenuButtonProps) {
  return (
    <button
      type="button"
      // Keep focus (and thus the selection) inside the editor on click.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-teal/10 text-brand-teal"
          : "text-gray-500 hover:bg-gray-100 hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

function promptForLink(editor: Editor) {
  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const input = window.prompt(
    "Link URL (must start with http:// or https://)",
    previousUrl ?? "https://",
  );
  if (input === null) return;

  const url = input.trim();
  if (!url) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    toast.error("Enter a valid URL starting with http:// or https://.");
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

// Alt text matters for a professional blog — keep it one prompt away while
// an image is selected. Mirrors the promptForLink idiom.
function promptForImageAlt(editor: Editor) {
  const currentAlt = (editor.getAttributes("image").alt as string | null) ?? "";
  const input = window.prompt(
    "Image alt text (describes the image for screen readers and search engines)",
    currentAlt,
  );
  if (input === null) return;
  editor.chain().focus().updateAttributes("image", { alt: input.trim() }).run();
}

// One control per variant: switch the variant in place when the caret is
// already inside a callout, otherwise wrap the selection/current block.
function applyCallout(editor: Editor, variant: "note" | "warning") {
  if (editor.isActive("callout")) {
    editor.chain().focus().updateAttributes("callout", { variant }).run();
  } else {
    editor.chain().focus().setCallout({ variant }).run();
  }
}

// HTML in, HTML out — plugs into react-hook-form via Controller. The editor
// body reuses the public .article-body typography so authors see what
// readers will see.
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  // uploadFile is referentially stable (its whole dependency chain in the
  // auth provider is ref-backed), so the editor can capture it once.
  const { uploadFile } = useMediaUpload();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // StarterKit v3 bundles the Link extension (@tiptap/extension-link).
        link: {
          openOnClick: false,
          defaultProtocol: "https",
        },
      }),
      // Fixed column widths only — resizable adds drag handles and inline
      // colwidth styles that aren't worth the complexity here.
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TiptapImage,
      // Drag-drop / paste uploads share the picker's upload primitive.
      ImageUpload.configure({ upload: uploadFile }),
      Callout,
      PdfLink,
    ],
    content: value,
    // The admin shell is prerendered; rendering on mount avoids SSR
    // hydration mismatches.
    immediatelyRender: false,
    // Small toolbar — re-rendering per transaction keeps active states live.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "article-body min-h-[400px] px-6 py-5 focus:outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  // Adopt external value changes (e.g. the edit page resetting the form once
  // the post loads) without echoing them back through onChange.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[400px] rounded-b-lg bg-white px-6 py-5 text-sm text-gray-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
        <ToolbarButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 4"
          active={editor.isActive("heading", { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <Heading4 size={16} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => promptForLink(editor)}
        >
          <Link2 size={16} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />

        <ToolbarButton
          label="Insert table"
          active={editor.isActive("table")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          active={editor.isActive("image")}
          onClick={() => setShowImagePicker(true)}
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        {editor.isActive("image") && (
          <ToolbarButton
            label="Edit image alt text"
            onClick={() => promptForImageAlt(editor)}
          >
            <Captions size={16} />
          </ToolbarButton>
        )}
        <ToolbarButton
          label={editor.isActive("pdfLink") ? "Edit PDF link" : "Insert PDF link"}
          active={editor.isActive("pdfLink")}
          onClick={() => setShowPdfDialog(true)}
        >
          <FileText size={16} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />

        <ToolbarButton
          label="Note callout"
          active={editor.isActive("callout", { variant: "note" })}
          onClick={() => applyCallout(editor, "note")}
        >
          <Info size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Warning callout"
          active={editor.isActive("callout", { variant: "warning" })}
          onClick={() => applyCallout(editor, "warning")}
        >
          <TriangleAlert size={16} />
        </ToolbarButton>
        {editor.isActive("callout") && (
          <ToolbarButton
            label="Remove callout"
            onClick={() => editor.chain().focus().unsetCallout().run()}
          >
            <SquareX size={16} />
          </ToolbarButton>
        )}

        <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      {/* Contextual table controls — only while the caret is inside a table. */}
      {editor.isActive("table") && (
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <span className="px-1 text-xs uppercase tracking-wide text-gray-400">
            Table
          </span>
          <TableMenuButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            + Row below
          </TableMenuButton>
          <TableMenuButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            + Column after
          </TableMenuButton>
          <TableMenuButton
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            − Row
          </TableMenuButton>
          <TableMenuButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            − Column
          </TableMenuButton>
          <TableMenuButton
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            Header row
          </TableMenuButton>
          <span className="mx-1 h-4 w-px bg-gray-300" aria-hidden="true" />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Delete table
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {showImagePicker && (
        <MediaPickerDialog
          title="Insert Image"
          onOpenChange={(open) => {
            if (!open) setShowImagePicker(false);
          }}
          onSelect={(media: MediaResponse) => {
            editor
              .chain()
              .focus()
              .setImage({ src: media.url, alt: media.originalName })
              .run();
            setShowImagePicker(false);
          }}
        />
      )}

      {showPdfDialog && (
        <PdfLinkDialog
          initial={
            editor.isActive("pdfLink")
              ? {
                  href: (editor.getAttributes("pdfLink").href as string) ?? "",
                  label:
                    (editor.getAttributes("pdfLink").label as string) ??
                    DEFAULT_PDF_LABEL,
                }
              : undefined
          }
          onOpenChange={(open) => {
            if (!open) setShowPdfDialog(false);
          }}
          onSubmit={({ href, label }) => {
            // Editing a selected block updates it in place; otherwise insert a
            // new block at the caret.
            if (editor.isActive("pdfLink")) {
              editor.chain().focus().updatePdfLink({ href, label }).run();
            } else {
              editor.chain().focus().setPdfLink({ href, label }).run();
            }
            setShowPdfDialog(false);
          }}
        />
      )}
    </div>
  );
}
