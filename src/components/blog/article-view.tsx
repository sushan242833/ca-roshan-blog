import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import ShareArticle from "@/components/blog/share-article";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { formatPostDate } from "@/lib/format";
import { SITE_NAME } from "@/config/site.config";
import type { PostDetailResponse } from "@/types/post";

interface ArticleViewProps {
  post: PostDetailResponse;
  /** Public URL for the share buttons; omit to hide them (e.g. previews). */
  shareUrl?: string;
}

// The article presentation shared by the public post page and the admin
// draft preview — header, featured image, sanitised body, and tags.
export default function ArticleView({ post, shareUrl }: ArticleViewProps) {
  // Sanitise HTML content before rendering
  const cleanContent = DOMPurify.sanitize(post.content ?? "");

  const authorInitial = post.author?.name?.charAt(0).toUpperCase() ?? "A";
  const publishDate = formatPostDate(post.publishedAt ?? post.createdAt);

  return (
    <article className="mx-auto max-w-180 px-6 pt-12">
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

      {/* Featured image */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
        {post.featuredImage ? (
          <div className="relative aspect-video w-full">
            <Image
              src={post.featuredImage.url}
              alt={post.title}
              fill
              sizes="(max-width: 720px) 100vw, 720px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="aspect-video w-full">
            <PostImagePlaceholder className="h-full w-full" />
          </div>
        )}
      </div>

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
