import type { Metadata } from "next";
import ArticleView from "@/components/blogs/article-view";
import ChapterHub from "@/components/blogs/chapter-hub";
import PreviewBanner from "@/components/blogs/preview-banner";
import { apiRequest } from "@/lib/api";
import { SITE_NAME } from "@/config/site.config";
import type { ChapterIndexResponse, PostDetailResponse } from "@/types/post";

export const metadata: Metadata = {
  title: `Post Preview | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PostPreviewPage({ params }: PageProps) {
  const { token } = await params;

  // The chapter index, not the whole post: it applies the same pagination the
  // published page uses, so a large draft previews as its chapter hub instead
  // of one enormous single page. Short posts come back with `content` inline
  // and render through ArticleView exactly as before.
  let index: ChapterIndexResponse | null = null;
  try {
    // Previews are never cached — the draft may change at any moment.
    index = await apiRequest<ChapterIndexResponse>(
      `/v1/posts/preview/${encodeURIComponent(token)}/chapters`,
      { cache: "no-store" },
    );
  } catch {
    // Invalid, tampered, or expired token — fall through to the friendly
    // message below instead of crashing.
  }

  if (!index) {
    return (
      <div className="bg-white px-6 py-24 text-center">
        <div className="mx-auto max-w-[600px]">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-teal-dark">
            Preview
          </p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[#121c2a] md:text-[36px]">
            Preview link is invalid or has expired.
          </h1>
          <div className="mx-auto my-6 h-px w-24 bg-brand-muted" />
          <p className="text-[16px] leading-relaxed text-[#44474c]">
            Generate a new preview link from the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  const basePath = `/blogs/preview/${encodeURIComponent(token)}`;

  return (
    <div className="bg-white">
      <PreviewBanner />
      {index.paginated ? (
        <ChapterHub index={index} basePath={basePath} />
      ) : (
        <ArticleView
          post={
            { ...index, content: index.content ?? "" } as PostDetailResponse
          }
        />
      )}
    </div>
  );
}
