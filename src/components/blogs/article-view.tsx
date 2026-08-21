import Image from "next/image";
import Link from "next/link";
import ShareArticle from "@/components/blogs/share-article";
import ArticleToc from "@/components/blogs/article-toc";
import ReadingLayout from "@/components/blogs/reading-layout";
import { EyeIcon } from "@/components/icons";
import { buildToc } from "@/lib/toc";
import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import {
  optimizeArticleImages,
  optimizeCloudinaryUrl,
} from "@/lib/article-images";
import {
  isValidPdfUrl,
  toPublicFileLinks,
  toPublicFileUrl,
} from "@/lib/pdf-url";
import { DEFAULT_PDF_LABEL } from "@/lib/constants";
import { SITE_NAME } from "@/config/site.config";
import { ABOUT_AVATAR_SRC } from "@/content/about";
import type { PostDetailResponse } from "@/types/post";

interface ArticleViewProps {
  post: PostDetailResponse;
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

export default function ArticleView({ post, shareUrl }: ArticleViewProps) {
  const sanitized = sanitizeArticleHtml(post.content ?? "");
  const { html: withHeadingIds, headings } = buildToc(sanitized);
  const cleanContent = toPublicFileLinks(
    optimizeArticleImages(
      withHeadingIds
        .replace(/<table(?=[\s>])/g, '<div class="table-scroll"><table')
        .replace(/<\/table>/g, "</table></div>"),
    ),
  );

  const authorInitial = post.author?.name?.charAt(0).toUpperCase() ?? "R";
  const authorAvatar = post.author?.avatarUrl ?? ABOUT_AVATAR_SRC;
  const publishDate = formatArticleDate(post.publishedAt ?? post.createdAt);
  const updatedDate = formatArticleDate(post.updatedAt);
  const viewLabel = `${formatViewCount(post.viewCount)} ${
    post.viewCount === 1 ? "View" : "Views"
  }`;

  const categoryList =
    post.categories && post.categories.length > 0
      ? post.categories
      : post.category
        ? [post.category]
        : [];

  const contentHasPdfLink = /class="[^"]*\bpdf-link-block\b[^"]*"/.test(
    sanitized,
  );
  const legacyPdfUrl =
    post.pdfUrl && isValidPdfUrl(post.pdfUrl)
      ? toPublicFileUrl(post.pdfUrl)
      : null;
  const showLegacyPdf = Boolean(legacyPdfUrl) && !contentHasPdfLink;
  const legacyPdfLabel = post.pdfLabel?.trim() || DEFAULT_PDF_LABEL;

  return (
    <article className="text-[#121c2a]">
      <header className="px-6 pb-8 pt-16 text-center">
        <div className="mx-auto max-w-200">
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

          <div className="flex flex-col items-center justify-center gap-4 border-y border-brand-muted/30 py-6 sm:flex-row">
            {authorAvatar ? (
              <Image
                src={authorAvatar}
                alt={post.author?.name ?? SITE_NAME}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-teal-dark text-base font-bold text-white">
                {authorInitial}
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-[14px] font-semibold leading-none text-[#121c2a]">
                {post.author?.name ?? SITE_NAME}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] leading-normal text-[#3f4945] sm:justify-start">
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
          <div className="mx-auto max-w-250">
            <figure className="overflow-hidden rounded-xl bg-white shadow-lg">
              <Image
                src={optimizeCloudinaryUrl(post.featuredImage.url)}
                alt={post.title}
                width={1200}
                height={675}
                sizes="(max-width: 768px) 100vw, 1000px"
                className="h-auto max-h-140 w-full object-contain"
                priority
                loading="eager"
                fetchPriority="high"
              />
            </figure>
          </div>
        </section>
      )}

      <div className="px-6 pb-20">
        <ReadingLayout
          containerClassName="mx-auto max-w-300"
          bodyClassName="max-w-180"
          gapClassName="lg:gap-10"
          left={
            headings.length > 0
              ? {
                  key: "toc",
                  label: "Contents",
                  widthClassName: "lg:w-68",
                  sidebar: (
                    <ArticleToc headings={headings} variant="sidebar" fill />
                  ),
                  inline: <ArticleToc headings={headings} />,
                }
              : undefined
          }
        >
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
            <div className="mt-12 flex flex-wrap justify-center gap-2 border-t border-brand-muted pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-[#6f7975] px-4 py-1.5 text-xs font-medium text-[#3f4945] transition-colors hover:border-brand-teal-dark hover:text-brand-teal-dark"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {shareUrl && <ShareArticle title={post.title} url={shareUrl} />}
        </ReadingLayout>
      </div>
    </article>
  );
}
