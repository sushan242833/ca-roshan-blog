import { Node, mergeAttributes } from "@tiptap/core";
import { DEFAULT_PDF_LABEL } from "@/lib/constants";

export interface PdfLinkAttributes {
  href: string;
  label?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfLink: {
      /** Insert a PDF link block at the current cursor position. */
      setPdfLink: (attributes: PdfLinkAttributes) => ReturnType;
      /** Update the currently selected PDF link block in place. */
      updatePdfLink: (attributes: PdfLinkAttributes) => ReturnType;
    };
  }
}

// A block-level, atomic anchor the admin can drop anywhere in the article. It
// renders as a plain <a class="pdf-link-block"> so it survives DOMPurify with
// no client JS and reuses the compact-chip CSS in globals.css. parseHTML
// matches a.pdf-link-block (high priority so it wins over the Link mark) so
// saved content round-trips when a post is reopened in the editor.
export const PdfLink = Node.create({
  name: "pdfLink",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) =>
          attributes.href ? { href: attributes.href } : {},
      },
      label: {
        default: DEFAULT_PDF_LABEL,
        parseHTML: (element) =>
          element.getAttribute("data-pdf-label") ||
          element.textContent ||
          DEFAULT_PDF_LABEL,
        renderHTML: (attributes) => ({
          "data-pdf-label": attributes.label || DEFAULT_PDF_LABEL,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a.pdf-link-block", priority: 1000 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label =
      (node.attrs.label as string | undefined)?.trim() || DEFAULT_PDF_LABEL;
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        class: "pdf-link-block",
        target: "_blank",
        rel: "noopener noreferrer",
      }),
      label,
    ];
  },

  addCommands() {
    return {
      setPdfLink:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
      updatePdfLink:
        (attributes) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attributes),
    };
  },
});

export default PdfLink;
