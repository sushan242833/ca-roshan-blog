import { describe, expect, it } from "vitest";
import {
  buildToc,
  parseHeadings,
  shallowestLevel,
  tocIndentClass,
} from "@/lib/toc";

describe("parseHeadings", () => {
  it("extracts h1, h2 and h3 with their levels and text", () => {
    const headings = parseHeadings(
      "<h1>Top Section</h1><h2>First Section</h2><p>body</p><h3>A Subsection</h3>",
    );
    expect(headings).toEqual([
      { id: "top-section", text: "Top Section", level: 1 },
      { id: "first-section", text: "First Section", level: 2 },
      { id: "a-subsection", text: "A Subsection", level: 3 },
    ]);
  });

  it("ignores h4, which is too deep for the contents rail", () => {
    const headings = parseHeadings(
      "<h1>Kept</h1><h2>Kept too</h2><h4>Dropped</h4>",
    );
    expect(headings.map((h) => h.text)).toEqual(["Kept", "Kept too"]);
  });

  it("reads headings the editor writes as classed paragraphs", () => {
    const headings = parseHeadings(
      '<p class="heading-1">Top</p>' +
        '<p class="heading-2">Middle</p>' +
        "<p>Body copy</p>" +
        '<p class="heading-3">Deep</p>',
    );

    expect(headings).toEqual([
      { id: "top", text: "Top", level: 1 },
      { id: "middle", text: "Middle", level: 2 },
      { id: "deep", text: "Deep", level: 3 },
    ]);
  });

  it("ignores a heading-4 paragraph, like a real h4", () => {
    const headings = parseHeadings(
      '<p class="heading-2">Kept</p><p class="heading-4">Dropped</p>',
    );
    expect(headings.map((h) => h.text)).toEqual(["Kept"]);
  });

  it("reads the class in any position and alongside other classes", () => {
    const headings = parseHeadings(
      '<p class="text-align-center heading-2">Centered</p>',
    );
    expect(headings.map((h) => h.level)).toEqual([2]);
  });

  it("mixes legacy tags and the paragraph form in document order", () => {
    const headings = parseHeadings(
      '<h2>Legacy</h2><p class="heading-2">Current</p>',
    );
    expect(headings.map((h) => h.text)).toEqual(["Legacy", "Current"]);
  });

  it("slugs like the backend: lowercase, hyphens, stripped punctuation", () => {
    const headings = parseHeadings("<h2>Tax &amp; Finance: Q1 2026!</h2>");
    expect(headings[0]).toEqual({
      id: "tax-finance-q1-2026",
      text: "Tax & Finance: Q1 2026!",
      level: 2,
    });
  });

  it("strips inline markup from the heading text and slug", () => {
    const headings = parseHeadings(
      '<h2>Some <strong>bold</strong> and <a href="https://x.com">linked</a> text</h2>',
    );
    expect(headings[0].text).toBe("Some bold and linked text");
    expect(headings[0].id).toBe("some-bold-and-linked-text");
  });

  it("de-duplicates colliding slugs with -1, -2 suffixes", () => {
    const headings = parseHeadings(
      "<h2>Overview</h2><h2>Overview</h2><h3>Overview</h3>",
    );
    expect(headings.map((h) => h.id)).toEqual([
      "overview",
      "overview-1",
      "overview-2",
    ]);
  });

  it("resolves a collision against an already-suffixed slug", () => {
    // "Overview" → overview, "Overview 1" → overview-1, second "Overview" must
    // skip the taken overview-1 and become overview-2.
    const headings = parseHeadings(
      "<h2>Overview</h2><h2>Overview 1</h2><h2>Overview</h2>",
    );
    expect(headings.map((h) => h.id)).toEqual([
      "overview",
      "overview-1",
      "overview-2",
    ]);
  });

  it("falls back to 'section' for a heading with no alphanumerics", () => {
    const headings = parseHeadings("<h2>!!!</h2><h2>???</h2>");
    expect(headings.map((h) => h.id)).toEqual(["section", "section-1"]);
  });
});

describe("buildToc", () => {
  it("injects ids onto the headings matching the returned list", () => {
    const { html, headings } = buildToc("<h2>Intro</h2><h3>Details</h3>");
    expect(html).toContain('<h2 id="intro">Intro</h2>');
    expect(html).toContain('<h3 id="details">Details</h3>');
    for (const heading of headings) {
      expect(html).toContain(`id="${heading.id}"`);
    }
  });

  it("preserves the ids and links agreement under collisions", () => {
    const { html, headings } = buildToc("<h2>Same</h2><h2>Same</h2>");
    expect(headings.map((h) => h.id)).toEqual(["same", "same-1"]);
    expect(html).toContain('<h2 id="same">Same</h2>');
    expect(html).toContain('<h2 id="same-1">Same</h2>');
  });

  it("replaces any pre-existing id rather than duplicating the attribute", () => {
    const { html } = buildToc('<h2 id="stale" class="x">Fresh</h2>');
    expect(html).toContain('<h2 class="x" id="fresh">Fresh</h2>');
    expect(html).not.toContain('id="stale"');
  });

  it("leaves non-heading content untouched", () => {
    const input = "<p>Paragraph</p><ul><li>Item</li></ul>";
    expect(buildToc(input).html).toBe(input);
  });

  it("gives an h1 an id so the contents can link to it", () => {
    const { html } = buildToc("<h1>Opening</h1>");
    expect(html).toContain('<h1 id="opening">Opening</h1>');
  });

  it("injects ids onto heading paragraphs, keeping their classes", () => {
    const { html, headings } = buildToc(
      '<p class="heading-2">Section</p><p>Body</p>',
    );

    expect(html).toBe(
      '<p class="heading-2" id="section">Section</p><p>Body</p>',
    );
    expect(headings).toEqual([{ id: "section", text: "Section", level: 2 }]);
  });

  it("leaves ordinary paragraphs byte-identical", () => {
    const input = '<p>One</p><p class="other">Two</p><p id="keep">Three</p>';
    expect(buildToc(input).html).toBe(input);
  });
});

describe("tocIndentClass", () => {
  it("indents relative to the shallowest heading, not the tag level", () => {
    // A post written with h2/h3 looks the same as one written with h1/h2.
    const withoutH1 = parseHeadings("<h2>A</h2><h3>B</h3>");
    expect(shallowestLevel(withoutH1)).toBe(2);
    expect(tocIndentClass(2, 2)).toBe("");
    expect(tocIndentClass(3, 2)).toBe("ml-3");

    const withH1 = parseHeadings("<h1>A</h1><h2>B</h2><h3>C</h3>");
    expect(shallowestLevel(withH1)).toBe(1);
    expect(tocIndentClass(1, 1)).toBe("");
    expect(tocIndentClass(2, 1)).toBe("ml-3");
    expect(tocIndentClass(3, 1)).toBe("ml-6");
  });

  it("treats an empty heading list as the deepest level", () => {
    expect(shallowestLevel([])).toBe(3);
  });
});
