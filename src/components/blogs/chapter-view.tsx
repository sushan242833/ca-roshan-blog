import Link from "next/link";
import ShareArticle from "@/components/blogs/share-article";
import ArticleToc from "@/components/blogs/article-toc";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildToc } from "@/lib/toc";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { optimizeArticleImages } from "@/lib/article-images";
import type { ChapterDetailResponse } from "@/types/post";

interface ChapterViewProps {
  /**
   * Route this chapter hangs off — `/blogs/<slug>` for a published post,
   * `/blogs/preview/<token>` for a draft preview. Keeping it a prop lets the
   * preview render the identical chapter page against a different route.
   */
  basePath: string;
  data: ChapterDetailResponse;
  /** Public URL of this chapter, for the share buttons. */
  shareUrl?: string;
}

// One chapter of a paginated post. Reuses the exact body pipeline ArticleView
// uses (sanitise -> heading ids -> table wrap -> image optimise), but on a
// single small chapter instead of the whole document, so the fetch stays under
// Next's 2 MB data-cache limit and the page renders and parses fast.
export default function ChapterView({
  basePath,
  data,
  shareUrl,
}: ChapterViewProps) {
  const { chapter, prev, next } = data;

  const sanitized = sanitizeArticleHtml(chapter.html ?? "");
  const { html: withHeadingIds, headings } = buildToc(sanitized);
  const cleanContent = optimizeArticleImages(
    withHeadingIds
      .replace(/<table(?=[\s>])/g, '<div class="table-scroll"><table')
      .replace(/<\/table>/g, "</table></div>"),
  );

  return (
    <article className="text-[#121c2a]">
      <header className="px-6 pb-8 pt-16 text-center">
        <div className="mx-auto max-w-[800px]">
          {/* Breadcrumb back to the article hub. */}
          <Link
            href={basePath}
            className="mb-4 inline-block text-[13px] font-semibold uppercase tracking-normal text-[#566475] transition-colors hover:text-brand-teal-dark"
          >
            {data.title}
          </Link>

          <h1 className="mb-8 font-serif text-[28px] font-bold leading-[1.2] tracking-normal text-[#121c2a] md:text-[40px]">
            {chapter.title}
          </h1>
        </div>
      </header>

      <div className="px-6 pb-12">
        <div className="mx-auto grid max-w-300 grid-cols-1 items-start gap-10 lg:grid-cols-4">
          {headings.length > 0 && (
            <aside className="hidden self-start lg:col-span-1 lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <ArticleToc headings={headings} variant="sidebar" />
            </aside>
          )}

          <div
            className={`mx-auto w-full min-w-0 max-w-180 ${
              headings.length > 0 ? "lg:col-span-3 lg:mx-0" : "lg:col-span-4"
            }`}
          >
            {headings.length > 0 && (
              <div className="lg:hidden">
                <ArticleToc headings={headings} />
              </div>
            )}

            <div
              className="article-body article-body-detail"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />

            {/* Previous / next chapter navigation. Links prefetch by default,
                so once chapters are ISR-cached the next one loads instantly. */}
            <nav className="mt-12 flex items-stretch justify-between gap-4 border-t border-brand-muted pt-6">
              {prev ? (
                <Link
                  href={`${basePath}/${prev.id}`}
                  className="group flex max-w-[48%] flex-col rounded-lg border border-brand-muted px-4 py-3 text-left transition-colors hover:border-brand-teal-dark"
                >
                  <span className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-[#566475]">
                    <ChevronLeft size={14} aria-hidden="true" />
                    Previous
                  </span>
                  <span className="mt-1 line-clamp-2 text-[14px] font-medium text-[#121c2a] group-hover:text-brand-teal-dark">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}

              {next ? (
                <Link
                  href={`${basePath}/${next.id}`}
                  className="group flex max-w-[48%] flex-col rounded-lg border border-[#bec9c4] px-4 py-3 text-right transition-colors hover:border-brand-teal-dark"
                >
                  <span className="flex items-center justify-end gap-1 text-[12px] font-semibold uppercase tracking-wide text-[#566475]">
                    Next
                    <ChevronRight size={14} aria-hidden="true" />
                  </span>
                  <span className="mt-1 line-clamp-2 text-[14px] font-medium text-[#121c2a] group-hover:text-brand-teal-dark">
                    {next.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
            </nav>

            {shareUrl && <ShareArticle title={chapter.title} url={shareUrl} />}
          </div>
        </div>
      </div>
    </article>
  );
}
