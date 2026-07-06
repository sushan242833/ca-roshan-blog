import Image from "next/image";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import ShareArticle from "@/components/blog/share-article";
import ArticleToc from "@/components/blog/article-toc";
import { formatPostDate } from "@/lib/format";
import { buildToc } from "@/lib/toc";
import { SITE_NAME } from "@/config/site.config";
import type { PostDetailResponse } from "@/types/post";

interface ArticleViewProps {
  post: PostDetailResponse;
  /** Public URL for the share buttons; omit to hide them (e.g. previews). */
  shareUrl?: string;
}

// The article presentation shared by the public post page and the admin
// draft preview — header, sanitised body, and tags.
export default function ArticleView({ post, shareUrl }: ArticleViewProps) {
  // Sanitise first, then derive the TOC and inject heading ids from the
  // sanitised HTML (a single parse in buildToc, so ids and links agree), and
  // finally wrap tables in a horizontal-scroll container. All post-sanitise
  // string work is safe because DOMPurify emits well-formed, balanced HTML.
  const sanitized = DOMPurify.sanitize(post.content ?? "");
  const { html: withHeadingIds, headings } = buildToc(sanitized);
  const cleanContent = withHeadingIds
    .replace(/<table(?=[\s>])/g, '<div class="table-scroll"><table')
    .replace(/<\/table>/g, "</table></div>");

  const authorInitial = post.author?.name?.charAt(0).toUpperCase() ?? "A";
  const publishDate = formatPostDate(post.publishedAt ?? post.createdAt);

  return (
    <article className="mx-auto max-w-180 px-6 pt-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-gray-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-teal">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-brand-teal">
              Blog
            </Link>
          </li>
          {post.category && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/categories/${post.category.slug}`}
                  className="hover:text-brand-teal"
                >
                  {post.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-gray-500" aria-current="page">
            {post.title}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        {post.category && (
          <span className="mb-4 inline-block rounded bg-brand-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-teal">
            {post.category.name}
          </span>
        )}
        <h1 className="font-serif text-3xl font-bold leading-tight text-brand-navy md:text-4xl">
          {post.title}
        </h1>

        {/* Author row */}
        <div className="mt-5 flex items-center gap-3">
          {post.author?.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt={post.author.name}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white">
              {authorInitial}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-brand-navy">
              By {post.author?.name ?? SITE_NAME}
            </p>
            <p className="text-xs text-gray-500">
              {publishDate} · {post.readingTime} min read
            </p>
          </div>
        </div>
      </header>

      {/* Featured image intentionally omitted here — it serves only as the
          listing thumbnail and the social-share/OG image, not the article
          body (see generateMetadata in the blog page). */}

      {/* Table of contents — only worth showing with a couple of sections */}
      {headings.length >= 2 && <ArticleToc headings={headings} />}

      {/* Body */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 border-t border-gray-200 pt-6">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-brand-teal hover:text-brand-teal"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Share */}
      {shareUrl && <ShareArticle title={post.title} url={shareUrl} />}
    </article>
  );
}
