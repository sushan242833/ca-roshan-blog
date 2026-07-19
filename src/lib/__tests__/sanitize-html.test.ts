import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";

describe("sanitizeArticleHtml", () => {
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
