import { describe, expect, it } from "vitest";
import {
  isValidPdfUrl,
  toPublicFileLinks,
  toPublicFileUrl,
} from "@/lib/pdf-url";

// The real shape stored by the Cloudinary media driver for a raw asset:
// version, folder, UUID name, extension included.
const RAW = "https://res.cloudinary.com/jsewsq7w/raw/upload";
const PDF = `${RAW}/v1787030235/ca-roshan-blog/d428ad8a.pdf`;

describe("toPublicFileUrl", () => {
  it("maps a Cloudinary raw URL onto the /files/ path", () => {
    expect(toPublicFileUrl(PDF)).toBe(
      "/files/v1787030235/ca-roshan-blog/d428ad8a.pdf",
    );
  });

  it("is idempotent, so re-saving a converted link cannot double-prefix it", () => {
    expect(toPublicFileUrl(toPublicFileUrl(PDF))).toBe(
      "/files/v1787030235/ca-roshan-blog/d428ad8a.pdf",
    );
  });

  it("leaves image URLs alone — the rewrite only covers raw/upload", () => {
    const image =
      "https://res.cloudinary.com/jsewsq7w/image/upload/v1785565849/ca-roshan-blog/a.png";
    expect(toPublicFileUrl(image)).toBe(image);
  });

  it("leaves a self-hosted /uploads/ path and a foreign host untouched", () => {
    expect(toPublicFileUrl("/uploads/a.pdf")).toBe("/uploads/a.pdf");
    expect(toPublicFileUrl("https://example.com/raw/upload/a.pdf")).toBe(
      "https://example.com/raw/upload/a.pdf",
    );
  });
});

describe("isValidPdfUrl", () => {
  it("accepts the /files/ path that uploads now produce", () => {
    expect(isValidPdfUrl(toPublicFileUrl(PDF))).toBe(true);
  });

  it("still accepts absolute http(s) URLs and /uploads/ paths", () => {
    expect(isValidPdfUrl(PDF)).toBe(true);
    expect(isValidPdfUrl("/uploads/a.pdf")).toBe(true);
  });

  it("rejects non-http schemes and arbitrary text", () => {
    expect(isValidPdfUrl("javascript:alert(1)")).toBe(false);
    expect(isValidPdfUrl("data:application/pdf;base64,AAAA")).toBe(false);
    expect(isValidPdfUrl("files/a.pdf")).toBe(false);
    expect(isValidPdfUrl("not a url")).toBe(false);
  });
});

describe("toPublicFileLinks", () => {
  it("rewrites a raw href stored in body HTML", () => {
    const html = `<a class="pdf-link-block" href="${PDF}">Full PDF</a>`;
    expect(toPublicFileLinks(html)).toBe(
      '<a class="pdf-link-block" href="/files/v1787030235/ca-roshan-blog/d428ad8a.pdf">Full PDF</a>',
    );
  });

  it("rewrites every occurrence, not just the first", () => {
    const html = `<a href="${PDF}">a</a><p>x</p><a href="${RAW}/v1/b.pdf">b</a>`;
    expect(toPublicFileLinks(html)).toBe(
      '<a href="/files/v1787030235/ca-roshan-blog/d428ad8a.pdf">a</a>' +
        '<p>x</p><a href="/files/v1/b.pdf">b</a>',
    );
  });

  it("leaves image sources and foreign links alone", () => {
    const html =
      '<img src="https://res.cloudinary.com/jsewsq7w/image/upload/v1/a.png" />' +
      '<a href="https://example.com/a.pdf">x</a>';
    expect(toPublicFileLinks(html)).toBe(html);
  });

  it("is idempotent, so an already-converted post is untouched", () => {
    const once = toPublicFileLinks(`<a href="${PDF}">a</a>`);
    expect(toPublicFileLinks(once)).toBe(once);
  });
});
