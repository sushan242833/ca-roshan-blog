"use client";

import { useRouter } from "next/navigation";
import type { CategoryResponse } from "@/types/category";

interface CategoryFilterPillsProps {
  categories: CategoryResponse[];
  activeSlug: string;
  currentSearch: string;
}

export default function CategoryFilterPills({
  categories,
  activeSlug,
  currentSearch,
}: CategoryFilterPillsProps) {
  const router = useRouter();

  function navigate(slug: string) {
    const params = new URLSearchParams();
    if (currentSearch) params.set("search", currentSearch);
    if (slug) params.set("category", slug);
    const qs = params.toString();
    router.push(`/blogs${qs ? `?${qs}` : ""}`);
  }

  const pillBase =
    "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors whitespace-nowrap";
  const pillActive = "bg-brand-teal text-white";
  const pillInactive =
    "border border-gray-300 bg-white text-gray-600 hover:border-brand-teal hover:text-brand-teal";

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <button
        onClick={() => navigate("")}
        className={`${pillBase} ${!activeSlug ? pillActive : pillInactive}`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => navigate(cat.slug)}
          aria-pressed={activeSlug === cat.slug}
          className={`${pillBase} ${activeSlug === cat.slug ? pillActive : pillInactive}`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
