"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiRequestError } from "@/lib/api";
import {
  ADMIN_POSTS_PER_PAGE,
  FEATURED_PICKER_DEBOUNCE_MS,
  MIN_SEARCH_LENGTH,
} from "@/lib/constants";
import { formatPostDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

interface FeaturedPostPickerProps {
  position: number;
  /** Post id → the slot position that already holds it. */
  usedPositions: Map<string, number>;
  onSelect: (post: PostSummaryResponse) => void;
  onCancel: () => void;
}

// Searchable list of PUBLISHED posts for one slot. Reads the admin posts list
// endpoint with the same filters and page size as Manage Posts' "Published"
// tab, so both screens share one React Query cache entry per search.
export default function FeaturedPostPicker({
  position,
  usedPositions,
  onSelect,
  onCancel,
}: FeaturedPostPickerProps) {
  const { authedFetch } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const next = searchInput.trim();
    const applied = next.length >= MIN_SEARCH_LENGTH ? next : "";
    if (applied === search) return;
    const handle = setTimeout(
      () => setSearch(applied),
      FEATURED_PICKER_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const postsQuery = useQuery({
    queryKey: queryKeys.posts({ status: "PUBLISHED", search, page: 1 }),
    queryFn: () => {
      const query = [
        "page=1",
        `limit=${ADMIN_POSTS_PER_PAGE}`,
        "status=PUBLISHED",
        search && `search=${encodeURIComponent(search)}`,
      ]
        .filter(Boolean)
        .join("&");
      return authedFetch<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts/admin/list?${query}`,
      );
    },
  });

  const posts = postsQuery.data?.items ?? [];
  const listId = `featured-picker-${position}`;

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          type="search"
          autoFocus
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          placeholder="Search published posts…"
          aria-label={`Search published posts for slot ${position}`}
          aria-controls={listId}
          className="pl-9"
        />
      </div>

      {postsQuery.isPending ? (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-gray-400">
          <Spinner size={16} />
          Loading posts…
        </div>
      ) : postsQuery.isError ? (
        <p className="px-1 py-4 text-sm text-red-600">
          {postsQuery.error instanceof ApiRequestError
            ? postsQuery.error.message
            : "Failed to load posts."}
        </p>
      ) : posts.length === 0 ? (
        <p className="px-1 py-4 text-sm text-gray-400">
          {search ? "No published posts match your search." : "No published posts."}
        </p>
      ) : (
        <ul
          id={listId}
          aria-label={`Published posts for slot ${position}`}
          className="mt-2 max-h-72 divide-y divide-gray-100 overflow-y-auto"
        >
          {posts.map((post) => {
            const usedIn = usedPositions.get(post.id);
            const takenBySlot = usedIn !== undefined && usedIn !== position;
            // The hero post is kept out of Featured Insights.
            const disabled = takenBySlot || post.showInHero;
            return (
              <li key={post.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(post)}
                  className="flex w-full items-start justify-between gap-3 px-2 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-brand-navy">
                      {post.title}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {[
                        post.category?.name,
                        post.publishedAt && formatPostDate(post.publishedAt),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {disabled && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {takenBySlot ? `In slot ${usedIn}` : "In the hero"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
