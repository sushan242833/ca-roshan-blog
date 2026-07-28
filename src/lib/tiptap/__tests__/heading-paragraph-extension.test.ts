import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { HeadingParagraph } from "@/lib/tiptap/heading-paragraph-extension";
import { TextAlign } from "@/lib/tiptap/text-align-extension";

let editor: Editor | null = null;

// Mirrors the production wiring in rich-text-editor.tsx: StarterKit's own
// heading is off, HeadingParagraph provides it instead.
function createEditor(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit.configure({ heading: false }),
      HeadingParagraph.configure({ levels: [1, 2, 3, 4] }),
      TextAlign,
    ],
    content,
  });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("HeadingParagraph", () => {
  it("serialises each heading level as a classed paragraph", () => {
    for (const level of [1, 2, 3, 4] as const) {
      const instance = createEditor("<p>Text</p>");
      instance.commands.setNode("heading", { level });

      // Converting the only node leaves Tiptap's trailing empty paragraph, so
      // match the heading itself rather than the whole document.
      expect(instance.getHTML()).toContain(
        `<p class="heading-${level}">Text</p>`,
      );
      instance.destroy();
    }
  });

  it("parses legacy real heading tags into the paragraph form", () => {
    const instance = createEditor(
      "<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4>",
    );

    expect(instance.getHTML()).toBe(
      '<p class="heading-1">One</p>' +
        '<p class="heading-2">Two</p>' +
        '<p class="heading-3">Three</p>' +
        '<p class="heading-4">Four</p>',
    );
  });

  it("round-trips the paragraph form rather than demoting it to a paragraph", () => {
    const instance = createEditor('<p class="heading-2">Section</p>');

    expect(instance.getHTML()).toBe('<p class="heading-2">Section</p>');
    expect(instance.isActive("heading", { level: 2 })).toBe(true);
  });

  it("leaves an ordinary paragraph alone", () => {
    const instance = createEditor("<p>Just body text</p>");

    expect(instance.getHTML()).toBe("<p>Just body text</p>");
    expect(instance.isActive("heading")).toBe(false);
  });

  it("keeps the alignment class alongside the heading class", () => {
    const instance = createEditor(
      '<p class="heading-2 text-align-center">Centered</p>',
    );
    const html = instance.getHTML();

    expect(html).toContain("heading-2");
    expect(html).toContain("text-align-center");
  });

  it("still toggles back to a plain paragraph", () => {
    const instance = createEditor('<p class="heading-3">Section</p>');
    instance.commands.setNode("paragraph");

    expect(instance.getHTML()).toBe("<p>Section</p>");
  });
});
