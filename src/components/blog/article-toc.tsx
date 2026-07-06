"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import type { TocHeading } from "@/lib/toc";

interface ArticleTocProps {
  headings: TocHeading[];
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(callback: () => void): () => void {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

// Collapsible "Contents" box shown under the featured image. Server-renders
// expanded (desktop default); useSyncExternalStore reads the viewport on the
// client so it starts collapsed on mobile without a setState-in-effect.
export default function ArticleToc({ headings }: ArticleTocProps) {
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  // null = follow the viewport default; once the user toggles, honour that.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? !isMobile;
  const [activeId, setActiveId] = useState<string | null>(null);

  // Highlight the section currently in view. The rootMargin biases toward the
  // heading nearest the top of the viewport (below the sticky header).
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
        <ul className="px-4 pb-4 pt-1 text-sm">
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
      )}
    </nav>
  );
}
