import type { AuthedFetch } from "@/components/providers/auth-provider";
import type { PreviewTokenResponse } from "@/types/post";

// Shared by the Manage Posts row action and the editor's Preview button:
// mints a 60-minute preview token and opens the public preview page in a
// new tab. Callers catch failures and surface them via toast.
export async function openPostPreview(
  postId: string,
  authedFetch: AuthedFetch,
): Promise<void> {
  const { token } = await authedFetch<PreviewTokenResponse>(
    `/v1/posts/${postId}/preview-token`,
    { method: "POST" },
  );
  window.open(`/blog/preview/${encodeURIComponent(token)}`, "_blank");
}
