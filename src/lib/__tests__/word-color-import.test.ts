import { describe, expect, it } from "vitest";
import {
  applyImportedColors,
  classifyWordColor,
  WORD_COLOR_STYLE_MAP,
} from "@/lib/word-color-import";
import {
  TEXT_AMBER,
  TEXT_BLUE,
  TEXT_BROWN,
  TEXT_PINK,
  TEXT_RED,
} from "@/lib/editor-palette";

describe("classifyWordColor", () => {
  it("classifies the reds in Word's standard palette", () => {
    // Standard red, dark red, and the editor's own red.
    expect(classifyWordColor("FF0000")).toBe("red");
    expect(classifyWordColor("C00000")).toBe("red");
    expect(classifyWordColor("EE0000")).toBe("red");
  });

  it("classifies the blues in Word's standard palette", () => {
    // Standard blue, the Office accent blue, and the editor's own blue.
    expect(classifyWordColor("0000FF")).toBe("blue");
    expect(classifyWordColor("4472C4")).toBe("blue");
    expect(classifyWordColor("0070C0")).toBe("blue");
  });

  it("classifies brown, amber and pink palette colours", () => {
    expect(classifyWordColor("806000")).toBe("brown");
    expect(classifyWordColor("FFC000")).toBe("amber");
    expect(classifyWordColor("C00080")).toBe("pink");
  });

  it("leaves colours outside the palette hues alone", () => {
    expect(classifyWordColor("70AD47")).toBeNull(); // green
    expect(classifyWordColor("ED7D31")).toBeNull(); // orange
    expect(classifyWordColor("7030A0")).toBeNull(); // purple
  });

  it("treats black, greys and automatic colour as ordinary body text", () => {
    expect(classifyWordColor("000000")).toBeNull();
    expect(classifyWordColor("808080")).toBeNull();
    expect(classifyWordColor("auto")).toBeNull();
    expect(classifyWordColor(null)).toBeNull();
    expect(classifyWordColor(undefined)).toBeNull();
  });

  it("ignores values that are not six hex digits", () => {
    expect(classifyWordColor("")).toBeNull();
    expect(classifyWordColor("red")).toBeNull();
    expect(classifyWordColor("F00")).toBeNull();
  });
});

describe("applyImportedColors", () => {
  it("paints the red marker span with the palette red and drops the class", () => {
    const output = applyImportedColors(
      '<p><span class="word-import-red">red</span></p>',
    );

    expect(output).toBe(`<p><span style="color: ${TEXT_RED}">red</span></p>`);
  });

  it("paints the blue marker span with the palette blue", () => {
    const output = applyImportedColors(
      '<p><span class="word-import-blue">blue</span></p>',
    );

    expect(output).toBe(`<p><span style="color: ${TEXT_BLUE}">blue</span></p>`);
  });

  it("paints brown, amber and pink marker spans with their palette colours", () => {
    const output = applyImportedColors(
      '<p><span class="word-import-brown">brown</span> ' +
        '<span class="word-import-amber">amber</span> ' +
        '<span class="word-import-pink">pink</span></p>',
    );

    expect(output).toBe(
      `<p><span style="color: ${TEXT_BROWN}">brown</span> ` +
        `<span style="color: ${TEXT_AMBER}">amber</span> ` +
        `<span style="color: ${TEXT_PINK}">pink</span></p>`,
    );
  });

  it("turns a bare mark into the toolbar's pink text markup", () => {
    const output = applyImportedColors("<p><mark>hl</mark></p>");

    expect(output).toBe(
      `<p><span style="color: ${TEXT_PINK}">hl</span></p>`,
    );
  });

  it("keeps other formatting inside a coloured run", () => {
    const output = applyImportedColors(
      '<p><span class="word-import-red"><strong>bold red</strong></span></p>',
    );

    expect(output).toBe(
      `<p><span style="color: ${TEXT_RED}"><strong>bold red</strong></span></p>`,
    );
  });

  it("leaves uncoloured content untouched", () => {
    const input = "<h2>Heading</h2><p>Plain <em>body</em> text</p>";

    expect(applyImportedColors(input)).toBe(input);
  });
});

describe("WORD_COLOR_STYLE_MAP", () => {
  it("maps both run styles and Word's highlight", () => {
    expect(WORD_COLOR_STYLE_MAP).toEqual([
      "r.SiteImportRedText => span.word-import-red",
      "r.SiteImportBlueText => span.word-import-blue",
      "r.SiteImportBrownText => span.word-import-brown",
      "r.SiteImportAmberText => span.word-import-amber",
      "r.SiteImportPinkText => span.word-import-pink",
      "highlight => mark",
    ]);
  });
});
