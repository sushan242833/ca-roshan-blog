"use client";

import { useMemo } from "react";
import {
  QueryClient,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiRequestError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { MediaResponse } from "@/types/media";

export interface MediaListPage {
  items: MediaResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InfiniteMediaData {
  pages: MediaListPage[];
  pageParams: number[];
}

type MediaTypeFilter = "all" | "image" | "document";

// Matches the API's default page size. GET /v1/media used to return the entire
// library in one response, which grows without bound as the blog accumulates
// images — every picker open re-downloaded all of it.
const PAGE_SIZE = 24;

function mediaKeyFor(type: MediaTypeFilter) {
  return type === "all" ? queryKeys.media : queryKeys.mediaByType(type);
}

/**
 * Paginated media listing, shared by the Media Library, the image picker and
 * the PDF picker so the three cannot drift apart.
 *
 * Pages accumulate: `items` is every page fetched so far, which keeps the grid
 * a single scrollable list and lets callers treat it exactly like the old flat
 * array. Only `loadMore`/`hasMore` are new.
 */
export function useMediaList(type: MediaTypeFilter) {
  const { authedFetch } = useAuth();
  const queryKey = mediaKeyFor(type);

  const query = useInfiniteQuery<MediaListPage>({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const typeParam = type === "all" ? "" : `&type=${type}`;
      return authedFetch<MediaListPage>(
        `/v1/media?page=${pageParam as number}&limit=${PAGE_SIZE}${typeParam}`,
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    items,
    total: query.data?.pages[0]?.pagination.total ?? 0,
    isLoading: query.isPending,
    error: query.isError
      ? query.error instanceof ApiRequestError
        ? query.error.message
        : "Failed to load media."
      : "",
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
    queryKey,
  };
}

/**
 * Puts a freshly uploaded file at the top of a cached listing.
 *
 * Writes into the first page rather than replacing the array, so the accumulated
 * later pages survive. A cache with nothing in it yet is left alone — the query
 * will fetch page 1 including the new file anyway.
 */
export function prependMediaToCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  media: MediaResponse,
): void {
  queryClient.setQueryData<InfiniteMediaData>(queryKey, (previous) => {
    if (!previous || previous.pages.length === 0) {
      return previous;
    }

    const [first, ...rest] = previous.pages;
    return {
      ...previous,
      pages: [{ ...first, items: [media, ...first.items] }, ...rest],
    };
  });
}

/** Drops deleted media from every cached page of every media listing. */
export function removeMediaFromCache(
  queryClient: QueryClient,
  ids: string[],
): void {
  const idSet = new Set(ids);

  for (const key of [
    queryKeys.media,
    queryKeys.mediaByType("image"),
    queryKeys.mediaByType("document"),
  ]) {
    queryClient.setQueryData<InfiniteMediaData>(key, (previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        pages: previous.pages.map((page) => ({
          ...page,
          items: page.items.filter((media) => !idSet.has(media.id)),
        })),
      };
    });
  }
}

export function useMediaCache() {
  return useQueryClient();
}
