import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/config/site.config";
import type { RevalidateScope } from "@/lib/revalidate";

interface RevalidateTarget {
  path: string;
  /** Required for dynamic route patterns like "/blogs/[slug]". */
  type?: "page";
}

// The scope-to-paths mapping lives server-side on purpose: clients may only
// name a scope, never arbitrary paths.
const SCOPE_TARGETS: Record<RevalidateScope, RevalidateTarget[]> = {
  categories: [
    { path: "/" },
    { path: "/categories" },
    { path: "/categories/[slug]", type: "page" },
    // Category pills appear on post cards and filters.
    { path: "/blogs" },
  ],
  // Tags render on the post detail page.
  tags: [{ path: "/blogs/[slug]", type: "page" }],
  posts: [
    { path: "/" },
    { path: "/blogs" },
    { path: "/blogs/[slug]", type: "page" },
    { path: "/categories/[slug]", type: "page" },
  ],
};

function isRevalidateScope(value: unknown): value is RevalidateScope {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SCOPE_TARGETS, value)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is the logged-in admin by forwarding the Bearer
    // token to the backend — this route holds no secret of its own.
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const meResponse = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      headers: { Authorization: authorization },
      cache: "no-store",
    });
    if (!meResponse.ok) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const scope =
      body && typeof body === "object"
        ? (body as { scope?: unknown }).scope
        : undefined;
    if (!isRevalidateScope(scope)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const revalidated = SCOPE_TARGETS[scope].map(({ path, type }) => {
      if (type) {
        revalidatePath(path, type);
      } else {
        revalidatePath(path);
      }
      return path;
    });

    return NextResponse.json({ success: true, revalidated });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
