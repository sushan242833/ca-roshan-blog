import Link from "next/link";
import ShareArticle from "@/components/blogs/share-article";
import ArticleToc from "@/components/blogs/article-toc";
import ChapterRail from "@/components/blogs/chapter-rail";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildToc } from "@/lib/toc";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { optimizeArticleImages } from "@/lib/article-images";
import type { ChapterDetailResponse, ChapterSummary } from "@/types/post";

interface ChapterViewProps {
  basePath: string;
  data: ChapterDetailResponse;
  shareUrl?: string;
  chapters?: ChapterSummary[];
}

export default function ChapterView({
  basePath,
  data,
  shareUrl,
  chapters,
}: ChapterViewProps) {
  const { chapter, prev, next } = data;

  const sanitized = sanitizeArticleHtml(chapter.html ?? "");
  const { html: withHeadingIds, headings } = buildToc(sanitized);
  const cleanContent = optimizeArticleImages(
    withHeadingIds
      .replace(/<table(?=[\s>])/g, '<div class="table-scroll"><table')
      .replace(/<\/table>/g, "</table></div>"),
  );

  const hasToc = headings.length > 0;
  const railChapters = chapters && chapters.length > 1 ? chapters : null;
  const bodySpan =
    hasToc && railChapters
      ? "lg:col-span-6"
      : hasToc || railChapters
        ? "lg:col-span-9"
        : "lg:col-span-12";
  const railShell =
    "hidden self-start lg:col-span-3 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)]";

  return (
    <article className="text-[#121c2a]">
      <header className="px-6 pb-8 pt-16 text-center">
        <div className="mx-auto max-w-200">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-semibold uppercase tracking-normal">
            <Link
              href={basePath}
              className="text-[#566475] transition-colors hover:text-brand-teal-dark"
            >
              {data.title}
            </Link>
          </div>

          <h1 className="mb-8 font-serif text-[28px] font-bold leading-[1.2] tracking-normal text-[#121c2a] md:text-[40px]">
            {chapter.title}
          </h1>
        </div>
      </header>

      <div className="px-6 pb-12">
        <div className="mx-auto grid max-w-350 grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {hasToc && (
            <aside className={railShell}>
              <ArticleToc headings={headings} variant="sidebar" fill />
            </aside>
          )}

          <div className={`mx-auto w-full min-w-0 max-w-180 ${bodySpan}`}>
            {hasToc && (
              <div className="lg:hidden">
                <ArticleToc headings={headings} />
              </div>
            )}

            {/* Below lg the sidebar is gone, so the same rail rides above the
                body as a swipeable strip. */}
            {railChapters && (
              <div className="lg:hidden">
                <ChapterRail
                  basePath={basePath}
                  chapters={railChapters}
                  currentChapterId={chapter.id}
                  variant="strip"
                />
              </div>
            )}

            <div
              className="article-body article-body-detail"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />

            {/* Previous / next chapter navigation. Links prefetch by default,
                so once chapters are ISR-cached the next one loads instantly. */}
            <nav className="mt-12 grid gap-4 border-t border-brand-muted pt-8 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`${basePath}/${prev.id}`}
                  className="group flex flex-col rounded border border-brand-muted px-5 py-4 text-left transition-colors hover:border-brand-teal-dark"
                >
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#566475] transition-colors group-hover:text-brand-teal-dark">
                    <ChevronLeft size={13} aria-hidden="true" />
                    Previous chapter
                  </span>
                  <span className="mt-1.5 line-clamp-2 font-serif text-[16px] leading-snug text-[#121c2a] transition-colors group-hover:text-brand-teal-dark">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}

              {next && (
                <Link
                  href={`${basePath}/${next.id}`}
                  className="group flex flex-col rounded border border-brand-muted px-5 py-4 text-right transition-colors hover:border-brand-teal-dark"
                >
                  <span className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#566475] transition-colors group-hover:text-brand-teal-dark">
                    Next chapter
                    <ChevronRight size={13} aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 line-clamp-2 font-serif text-[16px] leading-snug text-[#121c2a] transition-colors group-hover:text-brand-teal-dark">
                    {next.title}
                  </span>
                </Link>
              )}
            </nav>

            {shareUrl && <ShareArticle title={chapter.title} url={shareUrl} />}
          </div>
          {railChapters && (
            <aside className={railShell}>
              <ChapterRail
                basePath={basePath}
                chapters={railChapters}
                currentChapterId={chapter.id}
                variant="sidebar"
              />
            </aside>
          )}
        </div>
      </div>
    </article>
  );
}
