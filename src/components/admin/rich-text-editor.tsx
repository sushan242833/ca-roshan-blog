"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

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

// HTML in, HTML out — plugs into react-hook-form via Controller. The editor
// body reuses the public .article-body typography so authors see what
// readers will see.
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // StarterKit v3 bundles the Link extension (@tiptap/extension-link).
        link: {
          openOnClick: false,
          defaultProtocol: "https",
        },
      }),
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

      <EditorContent editor={editor} />
    </div>
  );
}
