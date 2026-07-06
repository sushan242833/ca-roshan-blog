import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "note" | "warning";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the current selection (or block) in a callout. */
      setCallout: (attributes?: { variant: CalloutVariant }) => ReturnType;
      /** Wrap if outside a callout, lift out if already inside one. */
      toggleCallout: (attributes?: { variant: CalloutVariant }) => ReturnType;
      /** Lift the current block out of its enclosing callout. */
      unsetCallout: () => ReturnType;
    };
  }
}

function normalizeVariant(value: unknown): CalloutVariant {
  return value === "warning" ? "warning" : "note";
}

// A tinted, left-bordered box holding normal rich text (block+ content, so
// paragraphs/bold/links work inside). The variant drives the public and
// editor styling via the emitted `callout callout-{variant}` classes and the
// data-variant attribute (see globals.css). data-callout marks the wrapper so
// parseHTML round-trips it and DOMPurify's default config keeps it.
export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      variant: {
        default: "note" as CalloutVariant,
        parseHTML: (element) => normalizeVariant(element.getAttribute("data-variant")),
        renderHTML: (attributes) => ({
          "data-variant": normalizeVariant(attributes.variant),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = normalizeVariant(node.attrs.variant);
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
        class: `callout callout-${variant}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attributes),
      toggleCallout:
        (attributes) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attributes),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default Callout;
