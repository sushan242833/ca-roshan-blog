import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import PostCard from "@/components/posts/post-card";
import ShareArticle from "@/components/blog/share-article";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { formatPostDate } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/config/site.config";
import type {
  PostDetailResponse,
  PaginatedResponse,
  PostSummaryResponse,
} from "@/types/post";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await apiRequest<PostDetailResponse>(`/v1/posts/${slug}`);
    const title = `${post.metaTitle ?? post.title} | ${SITE_NAME}`;
    const description = post.metaDescription ?? post.excerpt ?? undefined;
    const images = post.featuredImage?.url
      ? [{ url: post.featuredImage.url, alt: post.title }]
      : [];

    return {
      title,
      description,
      openGraph: {
        type: "article",
        title,
        description,
        images,
        publishedTime: post.publishedAt ?? undefined,
        authors: post.author?.name ? [post.author.name] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: images.map((i) => i.url),
      },
    };
  } catch {
    return { title: `Article | ${SITE_NAME}` };
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  let post: PostDetailResponse;
  try {
    post = await apiRequest<PostDetailResponse>(`/v1/posts/${slug}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    notFound();
  }

  // Sanitise HTML content before rendering
  const cleanContent = DOMPurify.sanitize(post.content ?? "");

  // Fetch related posts from the same category (filter out current post)
  let relatedPosts: PostSummaryResponse[] = [];
  if (post.category?.slug) {
    try {
      const related = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?category=${post.category.slug}&limit=4`,
        { next: { revalidate: 60 } },
      );
      relatedPosts = related.items
        .filter((p) => p.id !== post.id)
        .slice(0, 3);
    } catch {
      // silently fall through — related section will be hidden
    }
  }

  const authorInitial = post.author?.name?.charAt(0).toUpperCase() ?? "A";
  const publishDate = formatPostDate(post.publishedAt ?? post.createdAt);

  return (
    <div className="bg-white pb-16">
      {/* ── Article ─────────────────────────────────────────────── */}
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
        <ShareArticle title={post.title} url={`${SITE_URL}/blog/${slug}`} />

      </article>

      {/* ── Recommended for You ──────────────────────────────────── */}
      {relatedPosts.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl border-t border-gray-200 px-6 pt-12">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-brand-navy">
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {relatedPosts.map((p) => (
              <PostCard key={p.id} post={p} variant="recommended" />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
