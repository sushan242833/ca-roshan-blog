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

function slugifyHeading(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const HEADING_RE = /<(h[1-6]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const HEADING_CLASS_RE = /\bheading-([1-6])\b/;
const EXISTING_ID_RE = /\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const TOC_LEVELS: readonly number[] = [1, 2, 3];

function authoredLevelOf(tag: string, attrs: string): number | null {
  const level =
    tag.toLowerCase() === "p"
      ? Number(HEADING_CLASS_RE.exec(attrs)?.[1])
      : Number(tag[1]);

  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : null;
}

function semanticTagFor(level: number): string {
  return `h${Math.min(Math.max(level, 2), 6)}`;
}

export function buildToc(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const rewritten = html.replace(
    HEADING_RE,
    (match: string, tag: string, attrs: string, inner: string) => {
      const level = authoredLevelOf(tag, attrs);
      // Ordinary paragraphs pass straight through, unmodified.
      if (level === null) {
        return match;
      }

      const semanticTag = semanticTagFor(level);
      const cleanedAttrs = attrs.replace(EXISTING_ID_RE, "");

      // Deep headings become real tags but get no anchor and no contents entry.
      if (!TOC_LEVELS.includes(level)) {
        return `<${semanticTag}${cleanedAttrs}>${inner}</${semanticTag}>`;
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

      headings.push({ id, text, level: level as TocHeadingLevel });

      return `<${semanticTag}${cleanedAttrs} id="${id}">${inner}</${semanticTag}>`;
    },
  );

  return { html: rewritten, headings };
}

/** Heading list only — convenience wrapper over buildToc for callers/tests. */
export function parseHeadings(html: string): TocHeading[] {
  return buildToc(html).headings;
}
