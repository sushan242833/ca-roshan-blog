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

  it("demotes an in-body h1 to h2 so the article title keeps the only h1", () => {
    const { html } = buildToc("<h1>Opening</h1>");
    expect(html).toContain('<h2 id="opening">Opening</h2>');
    expect(html).not.toContain("<h1");
  });

  it("renders heading paragraphs as real heading tags, keeping their classes", () => {
    const { html, headings } = buildToc(
      '<p class="heading-2">Section</p><p>Body</p>',
    );

    // The class is retained so globals.css styles it identically — this is a
    // semantic change, not a visual one.
    expect(html).toBe(
      '<h2 class="heading-2" id="section">Section</h2><p>Body</p>',
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

// The editor serialises headings as <p class="heading-N">, so the public
// article had no real heading elements at all — bad for search engines and for
// screen-reader navigation. buildToc now converts both the paragraph form and
// the legacy real-tag form into semantic tags.
describe("semantic heading structure", () => {
  it("produces real h2/h3 elements from the editor's paragraph form", () => {
    const { html } = buildToc(
      '<p class="heading-2">Section</p>' +
        '<p class="heading-3">Subsection</p>' +
        "<p>Body copy</p>",
    );

    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).not.toContain('<p class="heading-2"');
    expect(html).not.toContain('<p class="heading-3"');
    // Ordinary paragraphs are still paragraphs.
    expect(html).toContain("<p>Body copy</p>");
  });

  it("builds the H1 > H2 > H3 tree the article page needs", () => {
    // The article title supplies the page's single H1 (ArticleView), so the
    // body must contribute H2s and H3s beneath it and no second H1.
    const { html } = buildToc(
      '<p class="heading-2">Chapter One</p>' +
        '<p class="heading-3">Part A</p>' +
        '<p class="heading-3">Part B</p>' +
        '<p class="heading-2">Chapter Two</p>',
    );

    const tags = [...html.matchAll(/<(h[1-6])\b/g)].map((m) => m[1]);
    expect(tags).toEqual(["h2", "h3", "h3", "h2"]);
    expect(html).not.toContain("<h1");
  });

  it("keeps legacy real-tag articles working and unchanged in level", () => {
    const { html, headings } = buildToc(
      "<h2>Legacy Section</h2><h3>Legacy Sub</h3>",
    );

    expect(html).toContain('<h2 id="legacy-section">Legacy Section</h2>');
    expect(html).toContain('<h3 id="legacy-sub">Legacy Sub</h3>');
    expect(headings.map((h) => h.level)).toEqual([2, 3]);
  });

  it("converts deep headings to real tags but leaves them out of the contents", () => {
    const { html, headings } = buildToc('<p class="heading-4">Deep</p>');

    expect(html).toBe('<h4 class="heading-4">Deep</h4>');
    expect(headings).toEqual([]);
  });

  it("never emits a level it skipped over on the way down", () => {
    const { html } = buildToc(
      '<p class="heading-1">One</p><p class="heading-2">Two</p>',
    );
    const tags = [...html.matchAll(/<(h[1-6])\b/g)].map((m) => m[1]);

    // Both flatten to h2 rather than producing a second page-level h1.
    expect(tags).toEqual(["h2", "h2"]);
  });

  it("anchors Nepali headings on the heading text, not on 'section'", () => {
    const { html, headings } = buildToc(
      '<p class="heading-2">नेपाली कर कानून</p>',
    );

    expect(headings[0].id).toBe("नेपाली-कर-कानून");
    expect(html).toContain('id="नेपाली-कर-कानून"');
  });

  it("gives two different Nepali headings two different anchors", () => {
    const headings = parseHeadings(
      '<p class="heading-2">आयकर</p><p class="heading-2">मूल्य अभिवृद्धि कर</p>',
    );

    expect(headings.map((h) => h.id)).toEqual(["आयकर", "मूल्य-अभिवृद्धि-कर"]);
    expect(new Set(headings.map((h) => h.id)).size).toBe(2);
  });

  it("still de-duplicates identical Nepali headings", () => {
    const headings = parseHeadings(
      '<p class="heading-2">आयकर</p><p class="heading-2">आयकर</p>',
    );

    expect(headings.map((h) => h.id)).toEqual(["आयकर", "आयकर-1"]);
  });
});
