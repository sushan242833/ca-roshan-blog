import type { Metadata } from "next";
import ChapterView from "@/components/blogs/chapter-view";
import { apiRequest } from "@/lib/api";
import { notFoundOrRethrow } from "@/lib/route-errors";
import { CONTENT_REVALIDATE_SECONDS } from "@/lib/constants";
import { fetchChapterIndex } from "@/lib/posts";
import { SITE_NAME, SITE_URL } from "@/config/site.config";
import type {
  ChapterDetailResponse,
  ChapterManifestEntry,
  ChapterSummary,
} from "@/types/post";

interface PageProps {
  params: Promise<{ slug: string; chapter: string }>;
}

export async function generateStaticParams() {
  try {
    const manifest = await apiRequest<ChapterManifestEntry[]>(
      `/v1/posts/chapter-manifest`,
      { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
    );

    return manifest.flatMap(({ slug, chapterIds }) =>
      chapterIds.map((chapter) => ({ slug, chapter })),
    );
  } catch {
    // dynamicParams below still renders every chapter on demand.
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
    { next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["posts"] } },
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
    notFoundOrRethrow(err);
  }

  // Best-effort: the index only powers the jump menu and contents list, so a
  // failure here must degrade to prev/next navigation, never 404 a chapter
  // whose body already loaded fine.
  let chapters: ChapterSummary[] | undefined;
  try {
    chapters = (await fetchChapterIndex(slug)).chapters;
  } catch {
    chapters = undefined;
  }

  return (
    <ChapterView
      basePath={`/blogs/${slug}`}
      data={data}
      shareUrl={`${SITE_URL}/blogs/${slug}/${chapter}`}
      chapters={chapters}
    />
  );
}
