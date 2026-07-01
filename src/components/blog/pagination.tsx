"use client";

import { useRouter } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  limit: number;
  currentSearch: string;
  activeCategory: string;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "…", total];
  if (current >= total - 2) return [1, "…", total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default function Pagination({
  currentPage,
  totalCount,
  limit,
  currentSearch,
  activeCategory,
}: PaginationProps) {
  const router = useRouter();
  const totalPages = Math.ceil(totalCount / limit);

  if (totalPages <= 1) return null;

  function navigate(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (currentSearch) params.set("search", currentSearch);
    if (activeCategory) params.set("category", activeCategory);
    const qs = params.toString();
    router.push(`/blog${qs ? `?${qs}` : ""}`);
  }

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <button
        onClick={() => navigate(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 py-2 text-sm text-gray-400"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => navigate(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-brand-teal text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => navigate(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
