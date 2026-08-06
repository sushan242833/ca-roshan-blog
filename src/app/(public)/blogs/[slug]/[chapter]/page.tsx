import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterView from "@/components/blogs/chapter-view";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { CONTENT_REVALIDATE_SECONDS } from "@/lib/constants";
import { SITE_NAME, SITE_URL } from "@/config/site.config";
import type {
  ChapterDetailResponse,
  ChapterIndexResponse,
  PaginatedResponse,
  PostSummaryResponse,
} from "@/types/post";

interface PageProps {
  params: Promise<{ slug: string; chapter: string }>;
}

// Pre-render every chapter of every paginated post at build. Each fetch here is
// the small chapter-index (no full content), so the build stays cheap.
export async function generateStaticParams() {
  try {
    const list = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
      `/v1/posts?limit=100`,
      { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
    );

    const params: { slug: string; chapter: string }[] = [];
    await Promise.all(
      list.items.map(async (post) => {
        try {
          const index = await apiRequest<ChapterIndexResponse>(
            `/v1/posts/${post.slug}/chapters`,
            { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
          );
          if (index.paginated) {
            for (const chapter of index.chapters) {
              params.push({ slug: post.slug, chapter: chapter.id });
            }
          }
        } catch {
          // skip this post; its chapters render on demand
        }
      }),
    );
    return params;
  } catch {
    return [];
  }
}

export const dynamicParams = true;

async function fetchChapter(
  slug: string,
  chapter: string,
): Promise<ChapterDetailResponse> {
  return apiRequest<ChapterDetailResponse>(
    `/v1/posts/${slug}/chapters/${chapter}`,
    { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, chapter } = await params;
  try {
    const data = await fetchChapter(slug, chapter);
    const title = `${data.chapter.title} | ${data.title} | ${SITE_NAME}`;
    return {
      title,
      alternates: { canonical: `/blogs/${slug}/${chapter}` },
      openGraph: {
        type: "article",
        title,
        images: data.featuredImage?.url
          ? [{ url: data.featuredImage.url, alt: data.title }]
          : [],
      },
    };
  } catch {
    return {
      title: `Article | ${SITE_NAME}`,
      alternates: { canonical: `/blogs/${slug}/${chapter}` },
    };
  }
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug, chapter } = await params;

  let data: ChapterDetailResponse;
  try {
    data = await fetchChapter(slug, chapter);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    notFound();
  }

  return (
    <ChapterView
      basePath={`/blogs/${slug}`}
      data={data}
      shareUrl={`${SITE_URL}/blogs/${slug}/${chapter}`}
    />
  );
}
