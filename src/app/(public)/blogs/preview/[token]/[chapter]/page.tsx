import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterView from "@/components/blogs/chapter-view";
import PreviewBanner from "@/components/blogs/preview-banner";
import { apiRequest } from "@/lib/api";
import { SITE_NAME } from "@/config/site.config";
import type { ChapterDetailResponse } from "@/types/post";

export const metadata: Metadata = {
  title: `Chapter Preview | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string; chapter: string }>;
}

// One chapter of a draft, reached from the preview hub. Renders through the same
// ChapterView the published pages use, so what an author checks here is what a
// reader will get.
export default async function PreviewChapterPage({ params }: PageProps) {
  const { token, chapter } = await params;

  let data: ChapterDetailResponse | null = null;
  try {
    // Never cached: the draft may change between previews.
    data = await apiRequest<ChapterDetailResponse>(
      `/v1/posts/preview/${encodeURIComponent(token)}/chapters/${encodeURIComponent(chapter)}`,
      { cache: "no-store" },
    );
  } catch {
    // Invalid/expired token or unknown chapter id.
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="bg-white">
      <PreviewBanner />
      {/* No shareUrl: a preview link is private and expires, so it must never
          be offered up to share buttons. */}
      <ChapterView
        basePath={`/blogs/preview/${encodeURIComponent(token)}`}
        data={data}
      />
    </div>
  );
}
