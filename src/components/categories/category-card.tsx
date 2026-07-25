import Link from "next/link";
import type { CategoryResponse } from "@/types/category";

interface CategoryCardProps {
  category: CategoryResponse;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <h2 className="font-serif text-xl font-bold text-brand-navy">
        {category.name}
      </h2>
      {category.description && (
        <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2">
          {category.description}
        </p>
      )}
      <div className="mt-4 flex-1">
        <span className="inline-block rounded-full bg-brand-teal px-3 py-1 text-xs font-medium text-white">
          {category.postCount}{" "}
          {category.postCount === 1 ? "article" : "articles"}
        </span>
      </div>
    </Link>
  );
}
