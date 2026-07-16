"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import type { TocHeading } from "@/lib/toc";

interface ArticleTocProps {
  headings: TocHeading[];
  /**
   * "inline" — collapsible "Contents" box in the article flow (used on mobile).
   * "sidebar" — always-open list for the fixed desktop sidebar.
   */
  variant?: "inline" | "sidebar";
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(callback: () => void): () => void {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

// Highlight the section currently in view. The rootMargin biases toward the
// heading nearest the top of the viewport (below the sticky header). Shared by
// both variants so the mobile box and the desktop sidebar track scroll alike.
function useActiveHeading(headings: TocHeading[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActiveId(topmost.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return activeId;
}

function TocLinks({
  headings,
  activeId,
}: {
  headings: TocHeading[];
  activeId: string | null;
}) {
  return (
    <ul className="text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "ml-4" : ""}>
          <a
            href={`#${heading.id}`}
            aria-current={activeId === heading.id ? "true" : undefined}
            className={`block border-l-2 py-1 pl-3 transition-colors ${
              activeId === heading.id
                ? "border-brand-teal font-medium text-brand-teal"
                : "border-transparent text-gray-600 hover:text-brand-teal"
            }`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Collapsible "Contents" box (mobile) and a fixed-sidebar list (desktop). The
// sidebar's sticky position + independent scroll is applied by the parent
// (ArticleView) so this component stays layout-agnostic.
export default function ArticleToc({
  headings,
  variant = "inline",
}: ArticleTocProps) {
  const activeId = useActiveHeading(headings);

  if (variant === "sidebar") {
    return (
      <nav aria-label="Table of contents">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-brand-navy">
          Contents
        </p>
        <TocLinks headings={headings} activeId={activeId} />
      </nav>
    );
  }

  return <InlineToc headings={headings} activeId={activeId} />;
}

// Server-renders expanded (desktop default); useSyncExternalStore reads the
// viewport on the client so it starts collapsed on mobile without a
// setState-in-effect.
function InlineToc({
  headings,
  activeId,
}: {
  headings: TocHeading[];
  activeId: string | null;
}) {
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  // null = follow the viewport default; once the user toggles, honour that.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !isMobile;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
    >
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-navy"
      >
        Contents
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="px-1 pb-4 pt-1">
          <TocLinks headings={headings} activeId={activeId} />
        </div>
      )}
    </nav>
  );
}
