import type { Metadata } from "next";
import Link from "next/link";
import PostCard from "@/components/posts/post-card";
import Pagination from "@/components/blog/pagination";
import { apiRequest } from "@/lib/api";
import { POSTS_PER_PAGE } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

const PAGE_SUBTITLE =
  "A comprehensive library of insights, analysis, and strategic guidance " +
  "tailored for professionals navigating the complex financial landscape " +
  "of Nepal and beyond.";

export function generateMetadata(): Metadata {
  return {
    title: "All Articles | CA Roshan",
    description: PAGE_SUBTITLE,
    alternates: { canonical: "/blog" },
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam, search = "", category = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let postsData: PaginatedResponse<PostSummaryResponse> = {
    items: [],
    pagination: { page: 1, limit: POSTS_PER_PAGE, total: 0, totalPages: 0 },
  };

  // search/category still honoured from the URL (deep links, category pages)
  // even though the on-page filter controls have been removed.
  const queryParts = [
    `page=${page}`,
    `limit=${POSTS_PER_PAGE}`,
    search && `search=${encodeURIComponent(search)}`,
    category && `category=${encodeURIComponent(category)}`,
  ]
    .filter(Boolean)
    .join("&");

  try {
    postsData = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
      `/v1/posts?${queryParts}`,
      { next: { revalidate: 60 } },
    );
  } catch (err) {
    console.error("Failed to fetch blog page data:", err);
  }

  const hasFilters = !!(search || category);

  return (
    <div className="bg-white">
      {/* Post grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          {postsData.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {postsData.items.map((post) => (
                <PostCard key={post.id} post={post} variant="summary" />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-gray-500">
                {hasFilters
                  ? "No articles found for your search. Try a different keyword or category."
                  : "No articles published yet."}
              </p>
              {hasFilters && (
                <Link
                  href="/blog"
                  className="mt-4 inline-block text-sm font-medium text-brand-teal underline-offset-2 hover:underline"
                >
                  Clear filters
                </Link>
              )}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalCount={postsData.pagination.total}
            limit={POSTS_PER_PAGE}
            currentSearch={search}
            activeCategory={category}
          />
        </div>
      </section>
    </div>
  );
}
