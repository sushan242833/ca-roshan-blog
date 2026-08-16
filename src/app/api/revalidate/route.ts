import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "@/config/site.config";
import type { RevalidateScope } from "@/lib/revalidate";

interface RevalidateTarget {
  path: string;
  type?: "page";
}

const SCOPE_TARGETS: Record<RevalidateScope, RevalidateTarget[]> = {
  categories: [
    { path: "/" },
    { path: "/categories" },
    { path: "/categories/[slug]", type: "page" },
    { path: "/blogs" },
    { path: "/sitemap.xml" },
  ],
  tags: [],
  posts: [
    { path: "/" },
    { path: "/blogs" },
    { path: "/categories/[slug]", type: "page" },
    { path: "/sitemap.xml" },
  ],
};

const SCOPE_TAGS: Record<RevalidateScope, string[]> = {
  categories: ["posts"],
  tags: ["posts"],
  posts: ["posts"],
};

function isRevalidateScope(value: unknown): value is RevalidateScope {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(SCOPE_TARGETS, value)
  );
}

export async function POST(request: NextRequest) {
  try {
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

    const revalidatedPaths = SCOPE_TARGETS[scope].map(({ path, type }) => {
      if (type) {
        revalidatePath(path, type);
      } else {
        revalidatePath(path);
      }
      return path;
    });

    const revalidatedTags = SCOPE_TAGS[scope];
    // { expire: 0 } means expire now. Next 16 requires the second argument,
    // and a named profile such as "max" only marks the entry stale — it keeps
    // serving the cached copy while it refreshes in the background, so an
    // unpublished post would still be readable on the next request.
    revalidatedTags.forEach((tag) => revalidateTag(tag, { expire: 0 }));

    return NextResponse.json({
      success: true,
      revalidated: [
        ...revalidatedPaths,
        ...revalidatedTags.map((tag) => `tag:${tag}`),
      ],
    });
  } catch (err) {
    console.error("Revalidation failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
