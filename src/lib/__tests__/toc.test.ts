import { describe, expect, it } from "vitest";
import { buildToc, parseHeadings } from "@/lib/toc";

describe("parseHeadings", () => {
  it("extracts h2 and h3 with their levels and text", () => {
    const headings = parseHeadings(
      "<h2>First Section</h2><p>body</p><h3>A Subsection</h3>",
    );
    expect(headings).toEqual([
      { id: "first-section", text: "First Section", level: 2 },
      { id: "a-subsection", text: "A Subsection", level: 3 },
    ]);
  });

  it("ignores headings other than h2/h3", () => {
    const headings = parseHeadings(
      "<h1>Title</h1><h2>Kept</h2><h4>Dropped</h4>",
    );
    expect(headings.map((h) => h.text)).toEqual(["Kept"]);
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
    const input = '<p>Paragraph</p><ul><li>Item</li></ul>';
    expect(buildToc(input).html).toBe(input);
  });
});
