export type TocHeadingLevel = 1 | 2 | 3;

export interface TocHeading {
  id: string;
  text: string;
  level: TocHeadingLevel;
}

// Indentation is relative to the shallowest heading in the document, not to the
// absolute tag level: a post written with h2/h3 reads the same as one written
// with h1/h2, instead of the whole rail shifting right because no h1 is used.
const INDENT_BY_DEPTH = ["", "ml-3", "ml-6"] as const;

export function shallowestLevel(headings: TocHeading[]): TocHeadingLevel {
  return headings.reduce<TocHeadingLevel>(
    (min, heading) => (heading.level < min ? heading.level : min),
    3,
  );
}

/**
 * Tailwind indent class for a heading, given the shallowest level present.
 * Lives here (rather than in a component) so the public TOC and the admin
 * outline can never drift apart.
 */
export function tocIndentClass(
  level: TocHeadingLevel,
  shallowest: TocHeadingLevel,
): string {
  const depth = Math.min(Math.max(level - shallowest, 0), 2);
  return INDENT_BY_DEPTH[depth];
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

// Two forms of heading reach this function. The editor now writes them as
// paragraphs carrying a `heading-<level>` class (see
// lib/tiptap/heading-paragraph-extension.ts), while posts published before that
// change still hold real h1–h4 tags, so both have to be recognised. Levels 1–3
// go in the contents; h4 stays out, being a sub-sub-heading that would only make
// the rail noisy.
const HEADING_RE = /<(h1|h2|h3|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const HEADING_CLASS_RE = /\bheading-([1-6])\b/;
const EXISTING_ID_RE = /\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const TOC_LEVELS: readonly number[] = [1, 2, 3];

// The level a matched element contributes to the contents, or null when it is
// not a heading at all (an ordinary paragraph) or is too deep to list.
function headingLevelOf(tag: string, attrs: string): TocHeadingLevel | null {
  const level =
    tag.toLowerCase() === "p"
      ? Number(HEADING_CLASS_RE.exec(attrs)?.[1])
      : Number(tag[1]);

  return TOC_LEVELS.includes(level) ? (level as TocHeadingLevel) : null;
}

/**
 * Single-pass parse of already-sanitised article HTML: assigns a URL-safe,
 * collision-free id to every level 1–3 heading, in either the paragraph or the
 * legacy tag form, and returns the rewritten HTML together with the heading
 * list. Doing both in one pass guarantees the ids in the returned HTML match the
 * ids in the returned headings (used for TOC links).
 */
export function buildToc(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const rewritten = html.replace(
    HEADING_RE,
    (match: string, tag: string, attrs: string, inner: string) => {
      const level = headingLevelOf(tag, attrs);
      // Ordinary paragraphs and h4s pass straight through, unmodified.
      if (level === null) {
        return match;
      }

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
