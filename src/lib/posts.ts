import { apiRequest } from "@/lib/api";
import { CONTENT_REVALIDATE_SECONDS } from "@/lib/constants";
import type { ChapterIndexResponse } from "@/types/post";

// Shared by the hub page and each individual chapter page: both need the full
// chapter list (the hub to render its contents rail, a chapter page to render
// its "jump to any chapter" navigator) — one fetch definition keeps the ISR
// tag and revalidate window from drifting between the two call sites.
export async function fetchChapterIndex(
  slug: string,
): Promise<ChapterIndexResponse> {
  return apiRequest<ChapterIndexResponse>(`/v1/posts/${slug}/chapters`, {
    next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["posts"] },
  });
}
