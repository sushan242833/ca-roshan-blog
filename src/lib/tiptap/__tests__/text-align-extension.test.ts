import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { TextAlign } from "@/lib/tiptap/text-align-extension";

describe("TextAlign extension", () => {
  function makeEditor(content: string) {
    return new Editor({
      extensions: [StarterKit, TextAlign],
      content,
    });
  }

  it("registers the setTextAlign command", () => {
    const editor = makeEditor("<p>hello</p>");
    expect(typeof editor.commands.setTextAlign).toBe("function");
    editor.destroy();
  });

  it("applies a text-align class to the selected block", () => {
    const editor = makeEditor("<p>hello</p>");
    editor.commands.selectAll();
    editor.commands.setTextAlign("center");
    expect(editor.getHTML()).toContain('class="text-align-center"');
    editor.destroy();
  });

  it("round-trips an existing alignment class from saved HTML", () => {
    const editor = makeEditor(
      '<p class="text-align-right">hi</p>',
    );
    expect(editor.getHTML()).toContain('class="text-align-right"');
    editor.destroy();
  });

  it("unsetTextAlign removes the alignment class", () => {
    const editor = makeEditor('<p class="text-align-center">hi</p>');
    editor.commands.selectAll();
    editor.commands.unsetTextAlign();
    expect(editor.getHTML()).not.toContain("text-align-center");
    editor.destroy();
  });
});
