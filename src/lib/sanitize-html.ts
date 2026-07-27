import sanitizeHtml from "sanitize-html";
import { isValidPdfUrl } from "@/lib/pdf-url";

// Server-side sanitiser for public/preview article HTML. Uses sanitize-html
// (a parser-based sanitiser, htmlparser2 under the hood) rather than DOMPurify:
// DOMPurify needs a server DOM, and jsdom's ESM-only transitive deps break
// under require() on Vercel's serverless runtime (ERR_REQUIRE_ESM). sanitize-html
// ships no DOM, so the blog detail page renders on Vercel. This is the ONLY XSS
// defence for article HTML — the backend stores post content unsanitised.
//
// The allowlist is built deliberately from what the TipTap editor
// (src/components/admin/rich-text-editor.tsx) can emit, NOT from sanitize-html's
// much narrower default, so HTML already stored on published posts is never
// silently stripped:
//   - StarterKit: p, headings (levels 2-4 only), strong, em, s, code, pre,
//     blockquote, ul, ol, li, hr, br, a
//   - Table extensions: table, thead, tbody, tr, th, td
//   - Image extension: img
//   - Callout custom node: div (marked with data-callout / data-variant)
//   - PdfLink custom node: a.pdf-link-block
const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "hr",
  "br",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "div",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // class is used everywhere — the Callout node (`callout callout-*`), the
    // pdf-link-block chip, and the TextAlign extension's `text-align-*` class.
    // A style attribute is permitted but clamped to text-align only (see
    // allowedStyles) so legacy/pasted `style="text-align:..."` still renders.
    "*": ["class", "style"],
    a: ["href", "target", "rel", "data-pdf-label"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    div: ["data-callout", "data-variant"],
  },
  // Only text-align survives on the style attribute — the TextAlign extension
  // is the sole legitimate source of inline styles. Everything else is dropped.
  allowedStyles: {
    "*": {
      "text-align": [/^(?:left|right|center|justify)$/],
    },
  },
  // Mirrors the previous DOMPurify default: http(s)/ftp/mailto/tel links are
  // allowed, javascript: and data: are rejected (the href is dropped, the
  // element survives). pdf-link-block hrefs get a stricter check below.
  transformTags: {
    a: (tagName, attribs) => {
      // Any link that opens a new tab must not leak the opener window.
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer";
      }

      // The inline PDF chip is the one anchor we render as an authored block,
      // so clamp its href to the same schemes the backend allows. Anything
      // else (javascript:, data:, ftp:, arbitrary text) leaves a chip with no
      // href rather than a bad link.
      const classes = (attribs.class ?? "").split(/\s+/);
      if (classes.includes("pdf-link-block")) {
        const href = attribs.href;
        if (!href || !isValidPdfUrl(href)) {
          delete attribs.href;
        }
      }

      return { tagName, attribs };
    },
  },
};

// Single sanitisation entry point for public/preview article HTML. Keeps the
// pdf-link-block anchors (class, href, target, rel, data-pdf-label) intact
// while stripping anything unsafe.
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export default sanitizeArticleHtml;
