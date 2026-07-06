export type TocHeadingLevel = 2 | 3;

export interface TocHeading {
  id: string;
  text: string;
  level: TocHeadingLevel;
}

// Mirrors the backend slug algorithm (backend src/utils/index.ts `slugify`):
// lowercase, runs of non-alphanumerics → single hyphen, trim edge hyphens.
// Implemented standalone on the frontend — no backend call — but kept in
// step so a heading and a slug derived from the same text look the same.
function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

// Decode the handful of named/numeric entities Tiptap emits, for the human
// label. &amp; is decoded last so "&amp;lt;" does not collapse into "<".
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const HEADING_RE = /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const EXISTING_ID_RE = /\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Single-pass parse of already-sanitised article HTML: assigns a URL-safe,
 * collision-free id to every h2/h3 and returns the rewritten HTML together
 * with the heading list. Doing both in one pass guarantees the ids in the
 * returned HTML match the ids in the returned headings (used for TOC links).
 */
export function buildToc(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const rewritten = html.replace(
    HEADING_RE,
    (_match, tag: string, attrs: string, inner: string) => {
      const level: TocHeadingLevel = tag.toLowerCase() === "h2" ? 2 : 3;
      const text = decodeEntities(stripTags(inner)).replace(/\s+/g, " ").trim();
      const base = slugifyHeading(text) || "section";

      // De-duplicate: first "foo", then "foo-1", "foo-2", … The while loop
      // also covers a literal heading that slugs straight to "foo-1".
      let id = base;
      let suffix = 1;
      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);

      headings.push({ id, text, level });

      const cleanedAttrs = attrs.replace(EXISTING_ID_RE, "");
      return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: rewritten, headings };
}

/** Heading list only — convenience wrapper over buildToc for callers/tests. */
export function parseHeadings(html: string): TocHeading[] {
  return buildToc(html).headings;
}
