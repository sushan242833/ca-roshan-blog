import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/posts/post-card";
import ArticleView from "@/components/blog/article-view";
import { apiRequest, ApiRequestError } from "@/lib/api";
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
      alternates: { canonical: `/blog/${slug}` },
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
    return {
      title: `Article | ${SITE_NAME}`,
      alternates: { canonical: `/blog/${slug}` },
    };
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

  return (
    <div className="bg-white pb-16">
      {/* ── Article ─────────────────────────────────────────────── */}
      <ArticleView post={post} shareUrl={`${SITE_URL}/blog/${slug}`} />

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
