import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import PostCard from "@/components/posts/post-card";
import Pagination from "@/components/blogs/pagination";
import { apiRequest } from "@/lib/api";
import { POSTS_PER_PAGE } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

const PAGE_TITLE = "All Articles";
const PAGE_SUBTITLE =
  "A comprehensive library of insights, analysis, and strategic guidance " +
  "tailored for professionals navigating the complex financial landscape " +
  "of Nepal and beyond.";

interface BlogSearchParams {
  page?: string;
  search?: string;
  category?: string;
}

function parsePage(pageParam?: string): number {
  return Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
}

// Search pages canonicalise to /blogs (they are not their own indexable
// destinations). Paginated pages get a self-referencing canonical so /blogs?page=3
// is not deindexed by pointing at /blogs.
function buildCanonical(
  search: string,
  category: string,
  page: number,
): string {
  if (search) return "/blogs";
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (category) params.set("category", category);
  const qs = params.toString();
  return `/blogs${qs ? `?${qs}` : ""}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<Metadata> {
  const { search = "", category = "", page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const trimmedSearch = search.trim();

  return {
    title: trimmedSearch
      ? `Search results for "${trimmedSearch}" | CA Roshan`
      : "All Articles | CA Roshan",
    description: PAGE_SUBTITLE,
    alternates: { canonical: buildCanonical(trimmedSearch, category, page) },
    // Search result pages are noindex (unbounded, low-value for the index) but
    // still followed so the linked articles are discovered.
    ...(trimmedSearch ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const { page: pageParam, search = "", category = "" } = await searchParams;
  const page = parsePage(pageParam);
  const trimmedSearch = search.trim();
  const isSearch = trimmedSearch.length > 0;

  let postsData: PaginatedResponse<PostSummaryResponse> = {
    items: [],
    pagination: { page: 1, limit: POSTS_PER_PAGE, total: 0, totalPages: 0 },
  };
  let loadFailed = false;

  const queryParts = [
    `page=${page}`,
    `limit=${POSTS_PER_PAGE}`,
    isSearch && `search=${encodeURIComponent(trimmedSearch)}`,
    category && `category=${encodeURIComponent(category)}`,
  ]
    .filter(Boolean)
    .join("&");

  try {
    postsData = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
      `/v1/posts?${queryParts}`,
      // Search terms are unbounded, so caching them would let a crawler fill the
      // Next data cache — never cache a search. Non-search listings keep ISR.
      isSearch ? { cache: "no-store" } : { next: { revalidate: 60 } },
    );
  } catch (err) {
    console.error("Failed to fetch blog page data:", err);
    loadFailed = true;
    // Opt this render out of the full-route cache so a transient outage page is
    // never served from cache for the ISR window.
    await connection();
  }

  const hasFilters = !!(isSearch || category);
  const total = postsData.pagination.total;

  return (
    <div className="bg-white">
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Page heading + subtitle (previously only in metadata). */}
          <header className="mb-8 max-w-3xl">
            <h1 className="font-serif text-3xl font-bold text-brand-navy md:text-4xl">
              {PAGE_TITLE}
            </h1>
            <p className="mt-3 text-gray-600">{PAGE_SUBTITLE}</p>
          </header>

          {loadFailed ? (
            <div className="py-20 text-center">
              <p className="text-gray-500">
                We could not load articles right now. Please try again shortly.
              </p>
            </div>
          ) : (
            <>
              {isSearch && total > 0 && (
                <p className="mb-6 text-sm text-gray-500">
                  {total} {total === 1 ? "result" : "results"} for &ldquo;
                  {trimmedSearch}&rdquo;
                </p>
              )}

              {postsData.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {postsData.items.map((post) => (
                    <PostCard key={post.id} post={post} variant="summary" />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-gray-500">
                    {isSearch
                      ? `No articles found for "${trimmedSearch}". Try a different keyword or category.`
                      : category
                        ? "No articles found for your filter. Try a different category."
                        : "No articles published yet."}
                  </p>
                  {hasFilters && (
                    <Link
                      href="/blogs"
                      className="mt-4 inline-block text-sm font-medium text-brand-teal underline-offset-2 hover:underline"
                    >
                      Clear filters
                    </Link>
                  )}
                </div>
              )}

              <Pagination
                currentPage={page}
                totalCount={total}
                limit={POSTS_PER_PAGE}
                currentSearch={trimmedSearch}
                activeCategory={category}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
