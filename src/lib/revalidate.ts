// "about" is intentionally absent: /about is force-static content compiled from
// @/content/about, so there is nothing to purge.
export type RevalidateScope = "categories" | "tags" | "posts";

// Asks our own /api/revalidate route to purge the Next cache for the public
// pages affected by an admin mutation. Same-origin on purpose — do NOT route
// this through apiRequest/authenticatedApiRequest, which prefix the Express
// API base URL.
//
// Fire-and-safe: a failed revalidation never breaks the admin mutation UX;
// the time-based ISR fallback will eventually catch up.
export async function revalidatePublicContent(
  scope: RevalidateScope,
  accessToken: string | null,
): Promise<void> {
  try {
    const res = await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ scope }),
    });
    if (!res.ok) {
      console.error(`Failed to revalidate "${scope}": HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`Failed to revalidate "${scope}":`, err);
  }
}
