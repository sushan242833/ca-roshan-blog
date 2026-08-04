// Optimises the images embedded in article body HTML at render time.
//
// Body images are stored as bare <img src="…"> pointing at the Cloudinary
// original — a full-resolution PNG with no transformation segment — because the
// body is arbitrary authored HTML. next/image is not usable here: it needs
// intrinsic width/height, and authored content carries none (only the featured
// image and avatar, which are structured fields, go through next/image). So the
// optimisation is pushed into the Cloudinary delivery URL instead, plus the
// loading hints the browser needs.
//
// This runs on the way out, on already-sanitised HTML. Stored content is never
// modified, so authoring is unaffected and the change applies retroactively to
// every existing post.

const CLOUDINARY_HOST = "res.cloudinary.com";

// f_auto  → WebP/AVIF chosen from the request's Accept header
// q_auto  → quality picked per image instead of a fixed number
// w_1200  → cap delivery at the widest the article column is ever rendered
const DELIVERY_TRANSFORMS = ["f_auto", "q_auto", "w_1200"];

// A transformation component is a short lowercase key, an underscore, then a
// value: f_auto, w_1200, c_fill, e_blur:300.
const TRANSFORM_COMPONENT = /^([a-z]{1,3})_[^,/]+$/;

// Requiring a REAL transformation key is what separates an existing
// transformation segment from a folder or file name that merely happens to
// contain an underscore ("my_photo.png", "tax_2083/"), which must not be
// rewritten. Covers the keys Cloudinary actually emits for image delivery.
const TRANSFORM_KEYS = new Set([
  "a", "ac", "ar", "b", "bo", "br", "c", "co", "cs", "d", "dl", "dn", "dpr",
  "du", "e", "eo", "f", "fl", "fn", "g", "h", "if", "l", "o", "pg", "q", "r",
  "so", "sp", "t", "u", "vc", "vs", "w", "x", "y", "z",
]);

function keyOf(component: string): string | null {
  return TRANSFORM_COMPONENT.exec(component)?.[1] ?? null;
}

// True only for a segment whose every comma-separated part looks like a
// transformation AND which uses at least one known key.
function isTransformSegment(segment: string): boolean {
  const parts = segment.split(",");
  const keys = parts.map(keyOf);
  return (
    keys.every((key) => key !== null) &&
    keys.some((key) => TRANSFORM_KEYS.has(key as string))
  );
}

// Whoever wrote the URL wins: an author who already asked for w_800 or f_webp
// keeps it, and only the keys they did not specify are added.
function mergeTransforms(existing: string): string {
  const present = new Set(existing.split(",").map(keyOf));
  const missing = DELIVERY_TRANSFORMS.filter(
    (transform) => !present.has(keyOf(transform)),
  );
  return missing.length > 0 ? [...missing, existing].join(",") : existing;
}

/**
 * Injects f_auto,q_auto,w_1200 into a Cloudinary image delivery URL.
 *
 * Non-Cloudinary URLs, relative paths, and delivery types other than
 * image/upload pass through untouched. URLs that already carry a transformation
 * segment keep it, gaining only the keys they are missing — so calling this
 * twice on the same URL is a no-op.
 */
export function optimizeCloudinaryUrl(src: string): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    // Relative or malformed: not a Cloudinary delivery URL.
    return src;
  }

  if (url.hostname !== CLOUDINARY_HOST) {
    return src;
  }

  // .../<resource_type>/upload/... — only image/upload is rewritten, leaving
  // video and the remote-fetch delivery type alone.
  const segments = url.pathname.split("/");
  const uploadIndex = segments.findIndex(
    (segment, i) => segment === "upload" && segments[i - 1] === "image",
  );
  if (uploadIndex === -1 || uploadIndex === segments.length - 1) {
    return src;
  }

  const next = segments[uploadIndex + 1];
  // The public ID is always last, so a transformation segment never is — that
  // rules out rewriting a bare "/upload/photo.png".
  if (uploadIndex + 1 < segments.length - 1 && isTransformSegment(next)) {
    segments[uploadIndex + 1] = mergeTransforms(next);
  } else {
    segments.splice(uploadIndex + 1, 0, DELIVERY_TRANSFORMS.join(","));
  }

  url.pathname = segments.join("/");
  return url.toString();
}

const IMG_TAG_RE = /<img\b([^>]*?)\/?>/gi;
const SRC_ATTR_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
// Stripped and re-added rather than appended blindly, so re-running this cannot
// leave an <img> with two loading attributes.
const MANAGED_ATTRS_RE =
  /\s+(?:loading|decoding|fetchpriority)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Rewrites every <img> in article body HTML: Cloudinary sources gain delivery
 * transformations, and every image gains loading/decoding hints.
 *
 * The first image stays eager with a high fetch priority — it is the one most
 * likely to be above the fold, and lazily loading it would delay LCP. Every
 * later image is lazy, so a long article no longer downloads images the reader
 * may never scroll to.
 *
 * Any width/height already on the tag is preserved untouched.
 */
export function optimizeArticleImages(html: string): string {
  let index = 0;

  return html.replace(IMG_TAG_RE, (_match, rawAttrs: string) => {
    const attrs = rawAttrs.replace(MANAGED_ATTRS_RE, "").trimEnd();
    const rewritten = attrs.replace(
      SRC_ATTR_RE,
      (_attr, doubleQuoted: string | undefined, singleQuoted: string | undefined) =>
        `src="${optimizeCloudinaryUrl(doubleQuoted ?? singleQuoted ?? "")}"`,
    );

    const isFirst = index === 0;
    index += 1;
    const loading = isFirst
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy"';

    return `<img${rewritten} ${loading} decoding="async" />`;
  });
}
