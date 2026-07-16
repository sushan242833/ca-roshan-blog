"use client";

import { parseHeadings } from "@/lib/toc";

interface EditorOutlineProps {
  /** Current editor HTML (react-hook-form's `content` field). */
  content: string;
  /**
   * Scroll the editor to the heading at this index. Indices match document
   * order, so they line up with the editor's own h2/h3 elements.
   */
  onSelect: (index: number) => void;
}

// Live table-of-contents preview for the admin editor. Mirrors what the public
// article page derives from the same headings (parseHeadings), so an author
// sees the TOC take shape as they write — the published page renders it via
// ArticleView, not this component.
export default function EditorOutline({ content, onSelect }: EditorOutlineProps) {
  const headings = parseHeadings(content);

  if (headings.length === 0) {
    return (
      <p className="mt-3 text-xs text-gray-400">
        Add H2 or H3 headings and they will appear here — this is the table of
        contents readers will see.
      </p>
    );
  }

  return (
    <ul className="mt-3 text-sm">
      {headings.map((heading, index) => (
        <li key={index} className={heading.level === 3 ? "ml-3" : ""}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            className="block w-full truncate border-l-2 border-transparent py-1 pl-3 text-left text-gray-600 transition-colors hover:border-brand-teal hover:text-brand-teal"
            title={heading.text}
          >
            {heading.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
