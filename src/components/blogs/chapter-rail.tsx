"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { ChapterSummary } from "@/types/post";

interface ChapterRailProps {
  basePath: string;
  chapters: ChapterSummary[];
  currentChapterId: string;
  variant: "sidebar" | "strip";
}

export default function ChapterRail({
  basePath,
  chapters,
  currentChapterId,
  variant,
}: ChapterRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const current = currentRef.current;
    if (!scroller || !current) return;

    if (variant === "strip") {
      scroller.scrollLeft = current.offsetLeft - 16;
    } else {
      scroller.scrollTop =
        current.offsetTop -
        scroller.clientHeight / 2 +
        current.offsetHeight / 2;
    }
  }, [variant, currentChapterId]);

  if (chapters.length <= 1) return null;

  const isStrip = variant === "strip";

  return (
    <nav
      aria-label="Chapters"
      className={isStrip ? "mb-8" : "flex h-full min-h-0 flex-col"}
    >
      <h2
        className={`mb-6 font-serif text-xl font-bold text-brand-teal-dark ${
          isStrip ? "" : "shrink-0"
        }`}
      >
        Chapters
      </h2>

      <div
        ref={scrollerRef}
        className={
          isStrip
            ? "relative -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2"
            : "relative min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        }
      >
        {chapters.map((chapter) => {
          const isCurrent = chapter.id === currentChapterId;

          return (
            <Link
              key={chapter.id}
              ref={isCurrent ? currentRef : undefined}
              href={`${basePath}/${chapter.id}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`block rounded border px-4 py-3 transition-colors ${
                isStrip ? "w-45 shrink-0 snap-start" : ""
              } ${
                isCurrent
                  ? "border-brand-teal-dark bg-[#f0f5f3] shadow-[inset_3px_0_0_0_#005243]"
                  : "border-brand-muted bg-white hover:border-brand-teal-dark"
              }`}
            >
              <span
                className={`block text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  isCurrent ? "text-brand-teal-dark" : "text-[#566475]"
                }`}
              >
                Chapter {chapter.order + 1}
              </span>
              <span
                className={`mt-1 block line-clamp-2 font-serif text-[15px] leading-snug ${
                  isCurrent ? "text-brand-teal-dark" : "text-[#121c2a]"
                }`}
              >
                {chapter.title}
              </span>
              {isCurrent && (
                <span className="sr-only"> — currently reading</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
