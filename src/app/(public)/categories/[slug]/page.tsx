import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostCard from "@/components/posts/post-card";
import Pagination from "@/components/blog/pagination";
import { apiRequest } from "@/lib/api";
import { POSTS_PER_PAGE } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";
import type { CategoryResponse } from "@/types/category";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const categories = await apiRequest<CategoryResponse[]>("/v1/categories");
    const category = categories.find((c) => c.slug === slug);
    if (!category) return { title: "Category | CA Roshan" };
    return {
      title: `${category.name} | CA Roshan`,
      alternates: { canonical: `/categories/${slug}` },
    };
  } catch {
    return { title: "Category | CA Roshan" };
  }
}

export default async function CategoryArchivePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let category: CategoryResponse | undefined;
  let postsData: PaginatedResponse<PostSummaryResponse> = {
    items: [],
    pagination: { page: 1, limit: POSTS_PER_PAGE, total: 0, totalPages: 0 },
  };

  try {
    const [categories, posts] = await Promise.all([
      apiRequest<CategoryResponse[]>("/v1/categories", {
        next: { revalidate: 300 },
      }),
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?category=${encodeURIComponent(slug)}&page=${page}&limit=${POSTS_PER_PAGE}`,
        { next: { revalidate: 60 } },
      ),
    ]);

    category = categories.find((c) => c.slug === slug);
    postsData = posts;
  } catch (err) {
    console.error("Failed to fetch category archive:", err);
  }

  if (!category) notFound();

  return (
    <div className="bg-white">
      {/* Category header */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-teal">
            Category
          </p>
          <h1 className="font-serif text-4xl font-bold text-brand-navy md:text-5xl">
            {category.name}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Posts grid */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          {postsData.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {postsData.items.map((post) => (
                <PostCard key={post.id} post={post} variant="summary" />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-gray-500">
              No articles in this category yet.
            </p>
          )}

          <Pagination
            currentPage={page}
            totalCount={postsData.pagination.total}
            limit={POSTS_PER_PAGE}
            basePath={`/categories/${slug}`}
          />
        </div>
      </section>
    </div>
  );
}
