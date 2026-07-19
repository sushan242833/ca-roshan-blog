import DOMPurify from "isomorphic-dompurify";
import { isValidPdfUrl } from "@/lib/pdf-url";

// Registered once per module load. DOMPurify hooks are global to the instance,
// so guarding avoids stacking duplicate hooks when this module is imported by
// several server-rendered pages.
let hookRegistered = false;

function ensureHook(): void {
  if (hookRegistered) return;

  // DOMPurify hooks live on a shared singleton that outlives HMR reloads of
  // this module. Clear any hook left behind by a previous reload first, so a
  // stale closure can never run alongside (or instead of) the current one.
  DOMPurify.removeHooks("afterSanitizeAttributes");

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // Note: don't use `instanceof Element` here — isomorphic-dompurify runs on
    // its own jsdom instance, so its Element differs from the ambient one.
    if (node.tagName !== "A") return;

    // Any link that opens a new tab must not leak the opener window.
    if (node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }

    // The inline PDF chip is the one anchor we render as an authored block, so
    // clamp its href to the same schemes the backend allows. DOMPurify has
    // already dropped javascript:/data: hrefs by this point; this also rejects
    // any other stray scheme, leaving a chip with no href rather than a bad
    // link.
    if (node.classList.contains("pdf-link-block")) {
      const href = node.getAttribute("href");
      if (!href || !isValidPdfUrl(href)) {
        node.removeAttribute("href");
      }
    }
  });

  hookRegistered = true;
}

// Single sanitisation entry point for public/preview article HTML. Keeps the
// pdf-link-block anchors (class, href, target, rel, data-pdf-label) intact
// while stripping anything unsafe.
export function sanitizeArticleHtml(html: string): string {
  ensureHook();
  return DOMPurify.sanitize(html, {
    // `target` and data-* attributes are allowed by default; listing target
    // explicitly documents the intent and survives any future config tightening.
    ADD_ATTR: ["target"],
  });
}

export default sanitizeArticleHtml;
