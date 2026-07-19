import { Extension } from "@tiptap/core";

export type TextAlignValue = "left" | "center" | "right" | "justify";

export interface TextAlignOptions {
  /** Node types the alignment attribute is attached to. */
  types: string[];
  /** Allowed alignment values. */
  alignments: TextAlignValue[];
  /** Value treated as "no alignment set". */
  defaultAlignment: TextAlignValue | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      /** Align the selected block(s) left/center/right/justify. */
      setTextAlign: (alignment: TextAlignValue) => ReturnType;
      /** Remove any explicit alignment (back to the default). */
      unsetTextAlign: () => ReturnType;
    };
  }
}

const ALIGN_CLASS_RE = /(?:^|\s)text-align-(left|center|right|justify)(?:\s|$)/;

// Adds a `textAlign` global attribute to block text nodes (paragraph,
// heading), emitted as a `text-align-<value>` CLASS rather than an inline
// style. A class survives DOMPurify untouched (see sanitize-html.ts) and
// reuses the CSS in globals.css, and this stays dependency-free by building on
// @tiptap/core instead of adding @tiptap/extension-text-align.
export const TextAlign = Extension.create<TextAlignOptions>({
  name: "textAlign",

  addOptions() {
    return {
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            // Read from our own class first, then a raw inline style (e.g.
            // pasted from Word), so existing content round-trips.
            parseHTML: (element) => {
              const match = element.className.match(ALIGN_CLASS_RE);
              if (match) return match[1];
              return element.style.textAlign || this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              const alignment = attributes.textAlign as TextAlignValue | null;
              if (!alignment || !this.options.alignments.includes(alignment)) {
                return {};
              }
              return { class: `text-align-${alignment}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment) =>
        ({ commands }) => {
          if (!this.options.alignments.includes(alignment)) return false;
          return this.options.types
            .map((type) =>
              commands.updateAttributes(type, { textAlign: alignment }),
            )
            .every((applied) => applied);
        },
      unsetTextAlign:
        () =>
        ({ commands }) => {
          return this.options.types
            .map((type) => commands.resetAttributes(type, "textAlign"))
            .every((applied) => applied);
        },
    };
  },
});

export default TextAlign;
