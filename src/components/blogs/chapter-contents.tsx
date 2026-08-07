"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChapterSummary } from "@/types/post";

interface ChapterContentsProps {
  /** Route the chapter links hang off — `/blogs/<slug>` or a preview path. */
  basePath: string;
  chapters: ChapterSummary[];
}

// A long guide has dozens of chapters, so the landing shows a readable preview
// and reveals the rest on request rather than dumping the whole list.
const PREVIEW_COUNT = 5;

// The numbered contents rail on the article landing page. Client-side only for
// the expand toggle; every entry is a plain <Link>, so all chapters remain
// crawlable in the collapsed state's markup once expanded — and the "View all"
// control degrades to nothing worse than a scroll if JS never loads.
export default function ChapterContents({
  basePath,
  chapters,
}: ChapterContentsProps) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = chapters.length > PREVIEW_COUNT;
  const visible =
    expanded || !canCollapse ? chapters : chapters.slice(0, PREVIEW_COUNT);

  return (
    <section className="mx-auto max-w-[600px] px-6 md:px-0">
      <h2 className="mb-8 border-b border-brand-muted pb-4 font-serif text-2xl font-semibold text-brand-teal-dark">
        Contents
      </h2>

      <ol className="relative ml-2.5 border-l-2 border-brand-muted/30">
        {visible.map((chapter) => (
          <li key={chapter.id}>
            <Link
              href={`${basePath}/${chapter.id}`}
              className="group relative -ml-0.5 block border-l-2 border-transparent py-4 pl-8 transition-colors duration-300 hover:border-brand-teal-dark"
            >
              {/* Sits on the rail, with a page-coloured backdrop so the
                  hairline appears to pass behind the numeral. */}
              <span
                aria-hidden="true"
                className="absolute -left-6 top-4 bg-white py-1 font-serif text-2xl text-brand-muted transition-colors group-hover:text-brand-teal-dark"
              >
                {String(chapter.order + 1).padStart(2, "0")}
              </span>
              <h3 className="mb-1 text-[14px] font-semibold leading-snug text-[#121c2a] transition-colors group-hover:text-brand-teal-dark">
                {chapter.title}
              </h3>
              {chapter.excerpt && (
                <p className="text-[16px] leading-relaxed text-[#44474c] opacity-80 transition-opacity group-hover:opacity-100">
                  {chapter.excerpt}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ol>

      {canCollapse && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="text-[14px] font-medium text-[#44474c] underline transition-colors hover:text-brand-teal-dark"
          >
            {expanded
              ? "Show fewer chapters"
              : `View all ${chapters.length} chapters`}
          </button>
        </div>
      )}
    </section>
  );
}
