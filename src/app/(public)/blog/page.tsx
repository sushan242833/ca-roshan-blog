import type { Metadata } from "next";
import Link from "next/link";
import PostSummaryCard from "@/components/posts/post-summary-card";
import CategoryFilterPills from "@/components/blog/category-filter-pills";
import SearchBar from "@/components/blog/search-bar";
import Pagination from "@/components/blog/pagination";
import { apiRequest } from "@/lib/api";
import { POSTS_PER_PAGE } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";
import type { CategoryResponse } from "@/types/category";

const PAGE_SUBTITLE =
  "A comprehensive library of insights, analysis, and strategic guidance " +
  "tailored for professionals navigating the complex financial landscape " +
  "of Nepal and beyond.";

export function generateMetadata(): Metadata {
  return {
    title: "All Articles | CA Roshan",
    description: PAGE_SUBTITLE,
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam, search = "", category = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let categories: CategoryResponse[] = [];
  let postsData: PaginatedResponse<PostSummaryResponse> = {
    items: [],
    pagination: { page: 1, limit: POSTS_PER_PAGE, total: 0, totalPages: 0 },
  };

  const queryParts = [
    `page=${page}`,
    `limit=${POSTS_PER_PAGE}`,
    search && `search=${encodeURIComponent(search)}`,
    category && `category=${encodeURIComponent(category)}`,
  ]
    .filter(Boolean)
    .join("&");

  try {
    [categories, postsData] = await Promise.all([
      apiRequest<CategoryResponse[]>("/v1/categories", {
        next: { revalidate: 300 },
      }),
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?${queryParts}`,
        { next: { revalidate: 60 } },
      ),
    ]);
  } catch (err) {
    console.error("Failed to fetch blog page data:", err);
  }

  const hasFilters = !!(search || category);

  return (
    <div className="bg-white">
      {/* Page heading */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-serif text-4xl font-bold text-brand-navy md:text-5xl">
            All Articles
          </h1>
          <p className="mt-3 max-w-2xl text-gray-500">{PAGE_SUBTITLE}</p>
        </div>
      </section>

      {/* Filter row */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CategoryFilterPills
            categories={categories}
            activeSlug={category}
            currentSearch={search}
          />
          <SearchBar defaultValue={search} activeCategory={category} />
        </div>
        <hr className="mt-6 border-gray-200" />
      </div>

      {/* Post grid */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          {postsData.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {postsData.items.map((post) => (
                <PostSummaryCard key={post.id} post={post} />
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
