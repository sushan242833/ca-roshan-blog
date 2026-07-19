// Mirrors the backend rule (post.validation.ts): a full-content PDF link is
// either an absolute http(s) URL or a relative /uploads/ path. Anything else
// — javascript:, data:, other schemes, arbitrary text — is rejected so the
// value can always be rendered as a plain href.
export function isValidPdfUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("/uploads/")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
