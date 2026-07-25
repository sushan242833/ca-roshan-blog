import type { Metadata } from "next";
import ArticleView from "@/components/blogs/article-view";
import { apiRequest } from "@/lib/api";
import { PREVIEW_TOKEN_EXPIRY_MINUTES } from "@/lib/constants";
import { SITE_NAME } from "@/config/site.config";
import type { PostDetailResponse } from "@/types/post";

export const metadata: Metadata = {
  title: `Post Preview | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PostPreviewPage({ params }: PageProps) {
  const { token } = await params;

  let post: PostDetailResponse | null = null;
  try {
    // Previews are never cached — the draft may change at any moment.
    post = await apiRequest<PostDetailResponse>(
      `/v1/posts/preview/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
  } catch {
    // Invalid, tampered, or expired token — fall through to the friendly
    // message below instead of crashing.
  }

  if (!post) {
    return (
      <div className="bg-[#f9f9ff] px-6 py-24 text-center">
        <h1 className="font-serif text-2xl font-bold text-brand-navy">
          Preview link is invalid or has expired.
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          Generate a new preview link from the admin dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9ff]">
      <div className="sticky top-0 z-50 bg-amber-500 px-6 py-2.5 text-center text-sm font-medium text-white">
        Preview mode — this is a draft preview and expires in{" "}
        {PREVIEW_TOKEN_EXPIRY_MINUTES} minutes.
      </div>
      <ArticleView post={post} />
    </div>
  );
}
