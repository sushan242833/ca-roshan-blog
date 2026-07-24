import type { AuthedFetch } from "@/components/providers/auth-provider";
import type { PostStatus, PreviewTokenResponse } from "@/types/post";

// Shared by the Manage Posts row action and the editor's Preview button.
// A PUBLISHED post opens its live public page (no preview banner); a draft or
// archived post mints a 60-minute preview token and opens the preview page.
// Callers catch failures and surface them via toast.
export async function openPostPreview(
  post: { id: string; slug: string; status: PostStatus },
  authedFetch: AuthedFetch,
): Promise<void> {
  if (post.status === "PUBLISHED") {
    window.open(`/blog/${encodeURIComponent(post.slug)}`, "_blank");
    return;
  }

  const { token } = await authedFetch<PreviewTokenResponse>(
    `/v1/posts/${post.id}/preview-token`,
    { method: "POST" },
  );
  window.open(`/blog/preview/${encodeURIComponent(token)}`, "_blank");
}
