import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/posts/post-card";
import ArticleView from "@/components/blog/article-view";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { SITE_NAME, SITE_URL } from "@/config/site.config";
import { htmlToPlainText } from "@/lib/format";
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
    // Excerpt can be auto-generated HTML — strip it so meta tags stay clean.
    const description =
      post.metaDescription ??
      (post.excerpt ? htmlToPlainText(post.excerpt) : undefined);
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
    <div className="bg-[#f9f9ff]">
      <ArticleView post={post} shareUrl={`${SITE_URL}/blog/${slug}`} />

      {relatedPosts.length > 0 && (
        <section className="bg-[#f9f9ff] px-6 py-20">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="mb-8 border-b border-[#bec9c4] pb-4 font-serif text-[32px] font-bold leading-[1.3] tracking-normal text-[#121c2a]">
              Recommended for You
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {relatedPosts.map((p) => (
                <PostCard key={p.id} post={p} variant="recommended" />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
