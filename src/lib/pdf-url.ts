// Public path prefix under which Cloudinary "raw" assets (the article PDFs) are
// served from this site's own domain. The mapping to Cloudinary lives in the
// rewrites() block of next.config.ts — keep the two in step.
export const PUBLIC_FILES_PREFIX = "/files/";

// Matches a Cloudinary raw delivery URL and captures everything after
// /raw/upload/, i.e. the version + folder + file part the rewrite forwards
// verbatim. Only "raw" is matched: image assets keep their Cloudinary URLs
// because they go through the delivery transformations in article-images.ts.
const CLOUDINARY_RAW_URL =
  /^https?:\/\/res\.cloudinary\.com\/[^/]+\/raw\/upload\/(.+)$/i;

/**
 * Rewrites a Cloudinary raw URL to its equivalent path on this domain, so a
 * link reads /files/v123/folder/file.pdf rather than exposing the Cloudinary
 * cloud name. Anything else — image URLs, /uploads/ paths, values already
 * pointing at /files/ — is returned unchanged, which makes this safe to apply
 * more than once and safe to apply to a URL of unknown origin.
 */
export function toPublicFileUrl(url: string): string {
  const match = CLOUDINARY_RAW_URL.exec(url.trim());
  return match ? `${PUBLIC_FILES_PREFIX}${match[1]}` : url;
}

// Mirrors the backend rule (post.validation.ts): a full-content PDF link is
// either an absolute http(s) URL or a relative /files/ or /uploads/ path.
// Anything else — javascript:, data:, other schemes, arbitrary text — is
// rejected so the value can always be rendered as a plain href.
export function isValidPdfUrl(value: string): boolean {
  const trimmed = value.trim();
  if (
    trimmed.startsWith(PUBLIC_FILES_PREFIX) ||
    trimmed.startsWith("/uploads/")
  ) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Anchored on a double-quoted href, which is the only form an anchor can take
// in stored body HTML: the sanitiser re-serialises every attribute that way.
const CLOUDINARY_RAW_HREF =
  /href="(https?:\/\/res\.cloudinary\.com\/[^/"]+\/raw\/upload\/[^"]+)"/gi;

/**
 * Applies toPublicFileUrl to every anchor in article body HTML, so a link an
 * author pasted as a Cloudinary URL — or one stored before the /files/ rewrite
 * existed — is served from this domain.
 *
 * Runs on the way out, on already-sanitised HTML. Stored content is untouched,
 * which makes the change retroactive across every existing post and safe to
 * re-run: a href already pointing at /files/ no longer matches.
 */
export function toPublicFileLinks(html: string): string {
  return html.replace(
    CLOUDINARY_RAW_HREF,
    (_match, url: string) => `href="${toPublicFileUrl(url)}"`,
  );
}
