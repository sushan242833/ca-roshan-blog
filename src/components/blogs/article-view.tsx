import Image from "next/image";
import Link from "next/link";
import ShareArticle from "@/components/blogs/share-article";
import ArticleToc from "@/components/blogs/article-toc";
import { EyeIcon } from "@/components/icons";
import { buildToc } from "@/lib/toc";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { isValidPdfUrl } from "@/lib/pdf-url";
import { DEFAULT_PDF_LABEL } from "@/lib/constants";
import { SITE_NAME } from "@/config/site.config";
import type { PostDetailResponse } from "@/types/post";

interface ArticleViewProps {
  post: PostDetailResponse;
  /** Public URL for the share buttons; omit to hide them (e.g. previews). */
  shareUrl?: string;
}

function formatArticleDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`;
  }

  if (count >= 1_000) {
    const value = count / 1_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
  }

  return count.toLocaleString("en-US");
}

// The article presentation shared by the public post page and the admin
// draft preview: centered editorial header, featured image, body, tags, share.
export default function ArticleView({ post, shareUrl }: ArticleViewProps) {
  // Sanitise first, then inject heading ids from the sanitised HTML, and finally
  // wrap tables in a horizontal-scroll container.
  const sanitized = sanitizeArticleHtml(post.content ?? "");
  const { html: withHeadingIds, headings } = buildToc(sanitized);
  const cleanContent = withHeadingIds
    .replace(/<table(?=[\s>])/g, '<div class="table-scroll"><table')
    .replace(/<\/table>/g, "</table></div>");

  const authorInitial = post.author?.name?.charAt(0).toUpperCase() ?? "A";
  const publishDate = formatArticleDate(post.publishedAt ?? post.createdAt);
  const updatedDate = formatArticleDate(post.updatedAt);
  const viewLabel = `${formatViewCount(post.viewCount)} ${
    post.viewCount === 1 ? "View" : "Views"
  }`;

  // A post can belong to one or more categories. Prefer the full set; fall
  // back to the legacy single category for posts saved before multi-category.
  const categoryList =
    post.categories && post.categories.length > 0
      ? post.categories
      : post.category
        ? [post.category]
        : [];

  // Backward compatibility: older posts stored the PDF link in post.pdfUrl and
  // rendered a card at the bottom. If such a post has no inline pdf-link-block
  // in its body, render the same compact chip at the end so the link survives.
  const contentHasPdfLink = /class="[^"]*\bpdf-link-block\b[^"]*"/.test(
    sanitized,
  );
  const legacyPdfUrl =
    post.pdfUrl && isValidPdfUrl(post.pdfUrl) ? post.pdfUrl : null;
  const showLegacyPdf = Boolean(legacyPdfUrl) && !contentHasPdfLink;
  const legacyPdfLabel = post.pdfLabel?.trim() || DEFAULT_PDF_LABEL;

  return (
    <article className="bg-[#f9f9ff] text-[#121c2a] selection:bg-[#a6f1db] selection:text-[#002019]">
      <header className="px-6 pb-8 pt-16 text-center">
        <div className="mx-auto max-w-[800px]">
          {categoryList.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              {categoryList.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="inline-block rounded bg-[#d3e1f6] px-3 py-1 text-[14px] font-semibold uppercase leading-none tracking-normal text-[#566475] transition-colors hover:bg-[#bac8dc]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          <h1 className="mb-8 font-serif text-[32px] font-bold leading-[1.2] tracking-normal text-[#121c2a] md:text-[48px]">
            {post.title}
          </h1>

          <div className="flex flex-col items-center justify-center gap-4 border-y border-[#bec9c4]/30 py-6 sm:flex-row">
            {post.author?.avatarUrl ? (
              <Image
                src={post.author.avatarUrl}
                alt={post.author.name}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#005243] text-base font-bold text-white">
                {authorInitial}
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-[14px] font-semibold leading-none text-[#121c2a]">
                {post.author?.name ?? SITE_NAME}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] leading-[1.5] text-[#3f4945] sm:justify-start">
                <span>Published: {publishDate}</span>
                <span aria-hidden="true">•</span>
                <span>Last Updated: {updatedDate}</span>
                <span aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1">
                  <EyeIcon size={14} />
                  {viewLabel}
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {post.featuredImage && post.showFeaturedImage && (
        <section className="mb-20 px-6">
          <div className="mx-auto max-w-[1000px]">
            <figure className="h-[260px] overflow-hidden rounded-xl shadow-lg sm:h-[360px] lg:h-[500px]">
              <Image
                src={post.featuredImage.url}
                alt={post.title}
                width={1200}
                height={675}
                sizes="(max-width: 768px) 100vw, 1000px"
                className="h-full w-full object-cover"
                priority
              />
            </figure>
          </div>
        </section>
      )}

      <div className="px-6 pb-20">
        <div className="mx-auto grid max-w-300 grid-cols-1 items-start gap-10 lg:grid-cols-4">
          {/* Desktop: sticky Table of Contents on the left — stays in place
              while the article column scrolls. */}
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
            {/* Mobile: collapsible TOC box in the article flow. */}
            {headings.length > 0 && (
              <div className="lg:hidden">
                <ArticleToc headings={headings} />
              </div>
            )}

            <div
              className="article-body article-body-detail"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />

            {showLegacyPdf && legacyPdfUrl && (
              <div className="article-body article-body-detail mt-8">
                <a
                  className="pdf-link-block"
                  href={legacyPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-pdf-label={legacyPdfLabel}
                >
                  {legacyPdfLabel}
                </a>
              </div>
            )}

            {post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap justify-center gap-2 border-t border-[#bec9c4] pt-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-[#6f7975] px-4 py-1.5 text-xs font-medium text-[#3f4945] transition-colors hover:border-[#005243] hover:text-[#005243]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {shareUrl && <ShareArticle title={post.title} url={shareUrl} />}
          </div>
        </div>
      </div>
    </article>
  );
}
