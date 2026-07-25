import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  limit: number;
  currentSearch?: string;
  activeCategory?: string;
  basePath?: string;
}

export function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "…", total];
  if (current >= total - 2) return [1, "…", total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default function Pagination({
  currentPage,
  totalCount,
  limit,
  currentSearch = "",
  activeCategory = "",
  basePath = "/blogs",
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / limit);

  if (!totalPages || isNaN(totalPages) || totalPages <= 1) return null;

  // Real URLs (not router.push handlers) so crawlers can follow them, users can
  // middle-click / open in a new tab, and Next can prefetch.
  function hrefFor(page: number): string {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (currentSearch) params.set("search", currentSearch);
    if (activeCategory) params.set("category", activeCategory);
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  }

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {isFirstPage ? (
        <span
          aria-disabled="true"
          className="px-3 py-2 text-sm text-gray-500 cursor-not-allowed opacity-40"
        >
          Previous
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage - 1)}
          className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-brand-teal"
        >
          Previous
        </Link>
      )}

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
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-brand-teal text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {p}
          </Link>
        ),
      )}

      {isLastPage ? (
        <span
          aria-disabled="true"
          className="px-3 py-2 text-sm text-gray-500 cursor-not-allowed opacity-40"
        >
          Next
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage + 1)}
          className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-brand-teal"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
