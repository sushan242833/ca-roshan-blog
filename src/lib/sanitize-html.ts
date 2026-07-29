import sanitizeHtml from "sanitize-html";
import { isValidPdfUrl } from "@/lib/pdf-url";
import { TEXT_PINK } from "@/lib/editor-palette";

// Server-side sanitiser for public/preview article HTML, and the only XSS
// defence for it — the backend stores post content unsanitised. sanitize-html
// rather than DOMPurify: DOMPurify needs a server DOM, and jsdom's ESM-only
// transitive deps break under require() on Vercel (ERR_REQUIRE_ESM).
//
// The allowlist tracks what the TipTap editor can emit
// (src/components/admin/rich-text-editor.tsx) rather than sanitize-html's much
// narrower default, so HTML on already-published posts is never silently
// stripped.
const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "s",
  "del",
  "strike",
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
  "span",
  "mark",
];

// Colour values the editor can produce: hex, as configured in the palette, and
// numeric rgb()/rgba(), which is what browser HTML serialisation normalises
// inline styles to. Closed shapes, so url(), var(), expression() and every
// other CSS payload fail them.
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const RGB_CHANNEL = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const RGB_ALPHA = "(?:0(?:\\.\\d+)?|1(?:\\.0+)?)";
const RGB_COLOR = new RegExp(
  `^(?:rgb\\(\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*\\)|rgba\\(\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_CHANNEL}\\s*,\\s*${RGB_ALPHA}\\s*\\))$`,
  "i",
);
const COLOR_VALUES = [HEX_COLOR, RGB_COLOR];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // class carries the Callout node (`callout callout-*`), the pdf-link-block
    // chip and TextAlign's `text-align-*`; style is clamped by allowedStyles.
    "*": ["class", "style"],
    a: ["href", "target", "rel", "data-pdf-label"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    div: ["data-callout", "data-variant"],
  },
  // Clamped to a closed set of properties AND values, so no styling beyond what
  // the editor's alignment and colour controls emit survives.
  allowedStyles: {
    "*": {
      "text-align": [/^(?:left|right|center|justify)$/],
      color: COLOR_VALUES,
    },
  },
  transformTags: {
    a: (tagName, attribs) => {
      // A link that opens a new tab must not leak the opener window.
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer";
      }

      // The PDF chip is the one anchor we render as an authored block, so clamp
      // its href to the schemes the backend allows — anything else leaves a chip
      // with no href rather than a bad link. Other anchors fall back to
      // sanitize-html's default schemes, which reject javascript: and data:.
      const classes = (attribs.class ?? "").split(/\s+/);
      const href = attribs.href;
      if (
        classes.includes("pdf-link-block") &&
        (!href || !isValidPdfUrl(href))
      ) {
        delete attribs.href;
      }

      return { tagName, attribs };
    },

    mark: () => {
      return { tagName: "span", attribs: { style: `color: ${TEXT_PINK}` } };
    },
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export default sanitizeArticleHtml;
