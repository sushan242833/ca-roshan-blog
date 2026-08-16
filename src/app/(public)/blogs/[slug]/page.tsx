import type { Metadata } from "next";
import PostCard from "@/components/posts/post-card";
import ArticleView from "@/components/blogs/article-view";
import ChapterHub from "@/components/blogs/chapter-hub";
import { apiRequest } from "@/lib/api";
import { notFoundOrRethrow } from "@/lib/route-errors";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  serializeJsonLd,
} from "@/lib/structured-data";
import { CONTENT_REVALIDATE_SECONDS } from "@/lib/constants";
import { fetchChapterIndex } from "@/lib/posts";
import { SITE_NAME, SITE_URL } from "@/config/site.config";
import { htmlToPlainText } from "@/lib/format";
import WarmBackend from "@/components/warm-backend";
import type {
  ChapterIndexResponse,
  PostDetailResponse,
  PaginatedResponse,
  PostSummaryResponse,
} from "@/types/post";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render published post landings at build so no visitor pays a live render.
export async function generateStaticParams() {
  try {
    const res = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
      `/v1/posts?limit=100`,
      { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
    );
    return res.items.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchChapterIndex(slug);
    const title = `${post.metaTitle ?? post.title} | ${SITE_NAME}`;
    const description =
      post.metaDescription ??
      (post.excerpt ? htmlToPlainText(post.excerpt) : undefined);
    const images = post.featuredImage?.url
      ? [{ url: post.featuredImage.url, alt: post.title }]
      : [];

    return {
      title,
      description,
      alternates: { canonical: `/blogs/${slug}` },
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
      alternates: { canonical: `/blogs/${slug}` },
    };
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  let index: ChapterIndexResponse;
  try {
    index = await fetchChapterIndex(slug);
  } catch (err) {
    notFoundOrRethrow(err);
  }

  // Related posts (same as before), from the same category.
  let relatedPosts: PostSummaryResponse[] = [];
  if (index.category?.slug) {
    try {
      const related = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?category=${index.category.slug}&limit=4`,
        { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
      );
      relatedPosts = related.items.filter((p) => p.id !== index.id).slice(0, 3);
    } catch {
      // silently fall through
    }
  }

  const relatedSection = relatedPosts.length > 0 && (
    <section className=" px-6 py-20">
      <div className="mx-auto max-w-300">
        <h2 className="mb-8 border-b border-brand-muted pb-4 font-serif text-[32px] font-bold leading-[1.3] tracking-normal text-[#121c2a]">
          Recommended for You
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {relatedPosts.map((p) => (
            <PostCard key={p.id} post={p} variant="recommended" />
          ))}
        </div>
      </div>
    </section>
  );

  const structuredData = [
    buildArticleSchema(index),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blogs", path: "/blogs" },
      { name: index.title, path: `/blogs/${encodeURIComponent(slug)}` },
    ]),
  ];

  const jsonLd = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
    />
  );

  // Short post: render the whole article on one page, exactly as before.
  if (!index.paginated) {
    const post = {
      ...index,
      content: index.content ?? "",
    } as PostDetailResponse;
    return (
      <div>
        {jsonLd}
        <WarmBackend />
        <ArticleView post={post} shareUrl={`${SITE_URL}/blogs/${slug}`} />
        {relatedSection}
      </div>
    );
  }

  return (
    <div className="bg-white text-[#121c2a]">
      {jsonLd}
      <WarmBackend />
      <ChapterHub index={index} basePath={`/blogs/${slug}`} />
      {relatedSection}
    </div>
  );
}
