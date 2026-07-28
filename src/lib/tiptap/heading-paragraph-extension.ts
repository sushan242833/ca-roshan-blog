import { mergeAttributes } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";

// Renders the editor's H1–H4 as paragraphs carrying a `heading-<level>` class
// instead of real <h1>–<h4> tags. The node keeps its "heading" name, so the
// toolbar buttons, toggleHeading commands, active states and the outline all
// behave exactly as before — only the serialised HTML changes.
//
// Parsing accepts both forms: the paragraph form written from now on, and the
// real heading tags held by posts saved before this change (and produced by the
// Word importer, whose output is parsed by this extension too). Published posts
// are not rewritten, so the CSS in globals.css and the TOC in lib/toc.ts have to
// keep handling real heading tags as well.
//
// The font scale comes from the same CSS the heading tags use, so the visual
// result is unchanged.

/** Class written onto the paragraph for a given heading level. */
export function headingLevelClass(level: number): string {
  return `heading-${level}`;
}

/** Matches the class on a heading paragraph, capturing the level. */
export const HEADING_CLASS_PATTERN = /\bheading-([1-6])\b/;

export const HeadingParagraph = Heading.extend({
  // Above the paragraph node's default (100) so `<p class="heading-2">` is
  // claimed by this extension rather than parsed as an ordinary paragraph.
  priority: 200,

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level)
      ? node.attrs.level
      : this.options.levels[0];

    return [
      "p",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: headingLevelClass(level),
      }),
      0,
    ];
  },

  parseHTML() {
    return [
      ...this.options.levels.map((level) => ({
        tag: `p.${headingLevelClass(level)}`,
        attrs: { level },
        // Beats the paragraph rule's default priority for the same element.
        priority: 100,
      })),
      // Legacy content saved as real heading tags.
      ...this.options.levels.map((level) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
    ];
  },
});

export default HeadingParagraph;
