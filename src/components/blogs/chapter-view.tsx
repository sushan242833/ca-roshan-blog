import Link from "next/link";
import ShareArticle from "@/components/blogs/share-article";
import ArticleToc from "@/components/blogs/article-toc";
import ChapterRail from "@/components/blogs/chapter-rail";
import ReadingLayout from "@/components/blogs/reading-layout";
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
        <ReadingLayout
          containerClassName="mx-auto max-w-350"
          bodyClassName="max-w-180"
          gapClassName="lg:gap-8"
          left={
            hasToc
              ? {
                  key: "toc",
                  label: "Contents",
                  widthClassName: "lg:w-81",
                  sidebar: (
                    <ArticleToc headings={headings} variant="sidebar" fill />
                  ),
                  inline: <ArticleToc headings={headings} />,
                }
              : undefined
          }
          right={
            railChapters
              ? {
                  key: "chapters",
                  label: "Chapters",
                  widthClassName: "lg:w-81",
                  sidebar: (
                    <ChapterRail
                      basePath={basePath}
                      chapters={railChapters}
                      currentChapterId={chapter.id}
                      variant="sidebar"
                    />
                  ),
                  // Below lg there is no rail, so the same list rides above the
                  // body as a swipeable strip.
                  inline: (
                    <ChapterRail
                      basePath={basePath}
                      chapters={railChapters}
                      currentChapterId={chapter.id}
                      variant="strip"
                    />
                  ),
                }
              : undefined
          }
        >
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
        </ReadingLayout>
      </div>
    </article>
  );
}
