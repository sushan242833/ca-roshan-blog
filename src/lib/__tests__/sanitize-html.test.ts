import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import {
  TEXT_AMBER,
  TEXT_BLUE,
  TEXT_BROWN,
  TEXT_PINK,
  TEXT_RED,
} from "@/lib/editor-palette";

describe("sanitizeArticleHtml", () => {
  it("keeps Tiptap text colors and turns old highlights into pink text", () => {
    const input =
      `<p><span style="color: ${TEXT_BLUE}">blue</span></p>` +
      `<p><span style="color: ${TEXT_BROWN}">brown</span></p>` +
      `<p><span style="color: ${TEXT_AMBER}">amber</span></p>` +
      `<p><span style="color: ${TEXT_RED}">red</span></p>` +
      `<p><span style="color: ${TEXT_PINK}">pink</span></p>` +
      '<p><mark style="background-color: rgb(251, 207, 232); color: inherit" ' +
      'data-color="rgb(251, 207, 232)">hahaha</mark></p>';

    const output = sanitizeArticleHtml(input);

    expect(output).toContain(`style="color:${TEXT_BLUE}"`);
    expect(output).toContain(`style="color:${TEXT_BROWN}"`);
    expect(output).toContain(`style="color:${TEXT_AMBER}"`);
    expect(output).toContain(`style="color:${TEXT_RED}"`);
    expect(output).toContain(`style="color:${TEXT_PINK}"`);
    expect(output).not.toContain("<mark");
    expect(output).not.toContain("background-color");
    expect(output).not.toContain("data-color");
  });

  it("keeps strikethrough text", () => {
    const output = sanitizeArticleHtml(
      "<p>Old <s>price</s> <del>discount</del> <strike>legacy</strike> new</p>",
    );

    expect(output).toBe(
      "<p>Old <s>price</s> <del>discount</del> <strike>legacy</strike> new</p>",
    );
  });

  it("strips unsafe or malformed inline color values", () => {
    const input =
      '<p><span style="color: var(--brand); background-color: url(javascript:alert(1))">Bad</span></p>' +
      '<p><mark style="background-color: rgb(999, 207, 232)" data-color="expression(alert(1))">Bad mark</mark></p>';

    const output = sanitizeArticleHtml(input);

    expect(output).not.toContain("var(");
    expect(output).not.toContain("url(");
    expect(output).not.toContain("javascript:");
    expect(output).not.toContain("rgb(999");
    expect(output).not.toContain("expression");
  });

  it("keeps a pdf-link-block anchor with its attributes intact", () => {
    const input =
      '<a class="pdf-link-block" href="/uploads/report.pdf" ' +
      'target="_blank" rel="noopener noreferrer" ' +
      'data-pdf-label="Read the full content (PDF)">Read the full content (PDF)</a>';

    const output = sanitizeArticleHtml(input);

    expect(output).toContain('class="pdf-link-block"');
    expect(output).toContain('href="/uploads/report.pdf"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain('data-pdf-label="Read the full content (PDF)"');
    expect(output).toContain("Read the full content (PDF)");
  });

  it("accepts an https pdf-link-block href", () => {
    const input =
      '<a class="pdf-link-block" href="https://example.com/full.pdf" ' +
      'target="_blank" rel="noopener noreferrer">Full report</a>';

    const output = sanitizeArticleHtml(input);

    expect(output).toContain('href="https://example.com/full.pdf"');
  });

  it("strips a javascript: href from a pdf-link-block", () => {
    const input =
      '<a class="pdf-link-block" href="javascript:alert(1)">Bad</a>';

    const output = sanitizeArticleHtml(input);

    expect(output).not.toContain("javascript:");
    // The anchor itself survives, just without a dangerous href.
    expect(output).toContain('class="pdf-link-block"');
    expect(output).not.toMatch(/href=/);
  });

  it("forces rel=noopener noreferrer on any target=_blank anchor", () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';

    const output = sanitizeArticleHtml(input);

    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("removes a disallowed scheme href from a pdf-link-block", () => {
    const input =
      '<a class="pdf-link-block" href="ftp://example.com/x.pdf">FTP</a>';

    const output = sanitizeArticleHtml(input);

    expect(output).not.toContain("ftp://");
    expect(output).toContain('class="pdf-link-block"');
  });
});
