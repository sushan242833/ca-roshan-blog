import type { Metadata } from "next";
import CategoryCard from "@/components/categories/category-card";
import { apiRequest } from "@/lib/api";
import type { CategoryResponse } from "@/types/category";

const PAGE_SUBTITLE =
  "Explore our comprehensive library of financial insights, regulatory " +
  "updates, and strategic advisory articles curated by industry experts.";

export const metadata: Metadata = {
  title: `Categories | CA Roshan`,
  description: PAGE_SUBTITLE,
};

export default async function CategoriesPage() {
  let categories: CategoryResponse[] = [];

  try {
    categories = await apiRequest<CategoryResponse[]>("/v1/categories", {
      next: { revalidate: 300 },
    });
  } catch (err) {
    console.error("Failed to fetch categories:", err);
  }

  return (
    <div className="bg-white">
      {/* Heading */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="font-serif text-4xl font-bold text-brand-navy md:text-5xl">
            Categories
          </h1>
          <p className="mt-3 max-w-xl text-gray-500">{PAGE_SUBTITLE}</p>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-6">
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-gray-500">
              No categories found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
