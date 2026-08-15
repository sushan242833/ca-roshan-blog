"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { shallowestLevel, tocIndentClass, type TocHeading } from "@/lib/toc";

interface ArticleTocProps {
  headings: TocHeading[];
  variant?: "inline" | "sidebar";
  numbered?: boolean;
  fill?: boolean;
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(callback: () => void): () => void {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

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
  numbered = false,
}: {
  headings: TocHeading[];
  activeId: string | null;
  numbered?: boolean;
}) {
  const shallowest = shallowestLevel(headings);

  return (
    <ul className="border-l border-brand-muted/40 text-sm">
      {headings.map((heading, i) => (
        <li
          key={heading.id}
          className={tocIndentClass(heading.level, shallowest)}
        >
          <a
            href={`#${heading.id}`}
            aria-current={activeId === heading.id ? "true" : undefined}
            className={`-ml-px flex items-start gap-3 border-l-4 py-1.5 pl-4 leading-snug transition-colors ${
              activeId === heading.id
                ? "border-brand-teal-dark font-semibold text-brand-teal-dark"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-brand-teal-dark"
            }`}
          >
            {numbered && (
              <span
                aria-hidden="true"
                className={`shrink-0 font-serif text-xs ${
                  activeId === heading.id ? "" : "opacity-60"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            <span>{heading.text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function ArticleToc({
  headings,
  variant = "inline",
  numbered = false,
  fill = false,
}: ArticleTocProps) {
  const activeId = useActiveHeading(headings);

  if (variant === "sidebar") {
    return (
      <nav
        aria-label="Table of contents"
        className={fill ? "flex h-full min-h-0 flex-col" : undefined}
      >
        <h2
          className={`mb-6 font-serif text-xl font-bold text-brand-teal-dark ${
            fill ? "shrink-0" : ""
          }`}
        >
          Table of Contents
        </h2>
        <div
          className={fill ? "min-h-0 flex-1 overflow-y-auto pr-1" : undefined}
        >
          <TocLinks
            headings={headings}
            activeId={activeId}
            numbered={numbered}
          />
        </div>
      </nav>
    );
  }

  return <InlineToc headings={headings} activeId={activeId} />;
}

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
