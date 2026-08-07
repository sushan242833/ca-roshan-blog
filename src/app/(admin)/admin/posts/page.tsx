"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatPostDate } from "@/lib/format";
import { revalidatePublicContent } from "@/lib/revalidate";
import { openPostPreview } from "@/lib/post-preview";
import { ADMIN_POSTS_PER_PAGE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import DeleteEntityDialog from "@/components/admin/delete-entity-dialog";
import PublishPostDialog from "@/components/admin/publish-post-dialog";
import { getPageNumbers } from "@/components/blogs/pagination";
import { queryKeys } from "@/lib/query-keys";
import FormMessage from "@/components/ui/form-message";
import type { DashboardStatsResponse } from "@/types/dashboard";
import type {
  PaginationMeta,
  PaginatedResponse,
  PostDetailResponse,
  PostStatus,
  PostSummaryResponse,
} from "@/types/post";

type StatusTab = PostStatus | "ALL";

interface TabDefinition {
  key: StatusTab;
  label: string;
  count: (stats: DashboardStatsResponse) => number;
}

const TABS: TabDefinition[] = [
  { key: "ALL", label: "All", count: (stats) => stats.totalPosts },
  { key: "PUBLISHED", label: "Published", count: (stats) => stats.published },
  { key: "DRAFT", label: "Drafts", count: (stats) => stats.drafts },
  { key: "ARCHIVED", label: "Archived", count: (stats) => stats.archived },
];

const STATUS_LABEL: Record<PostStatus, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

const STATUS_BADGE_CLASS: Record<PostStatus, string> = {
  PUBLISHED: "border-brand-teal/20 bg-brand-teal/10 text-brand-teal",
  DRAFT: "border-gray-200 bg-gray-100 text-gray-600",
  ARCHIVED: "border-amber-200 bg-amber-100 text-amber-700",
};

const EMPTY_MESSAGE: Record<StatusTab, string> = {
  ALL: "No posts yet.",
  PUBLISHED: "No published posts.",
  DRAFT: "No drafts.",
  ARCHIVED: "No archived posts.",
};

type StatusAction = "publish" | "unpublish" | "archive";

function parseStatusParam(value: string | null): StatusTab {
  const upper = value?.toUpperCase();
  return upper === "PUBLISHED" || upper === "DRAFT" || upper === "ARCHIVED"
    ? upper
    : "ALL";
}

function ManagePosts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState<StatusTab>(() =>
    parseStatusParam(searchParams.get("status")),
  );
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [search, setSearch] = useState(searchInput);
  const [page, setPage] = useState(
    () => Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1),
  );

  // Row whose mutation is in flight — its action buttons are disabled.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<PostSummaryResponse | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PostSummaryResponse | null>(
    null,
  );

  // Keep the URL in sync so a refresh restores the same tab/search/page.
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusTab !== "ALL") params.set("status", statusTab);
    if (search) params.set("search", search);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [statusTab, search, page]);

  // Debounced search — skipped when the input already matches the applied
  // search, so the initial render never resets the page from the URL.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, search]);

  // The filter object is the query key, so changing tab/search/page refetches
  // automatically — no manual debounce-and-refetch wiring needed.
  const postsQuery = useQuery({
    queryKey: queryKeys.posts({ status: statusTab, search, page }),
    queryFn: () => {
      const query = [
        `page=${page}`,
        `limit=${ADMIN_POSTS_PER_PAGE}`,
        statusTab !== "ALL" && `status=${statusTab}`,
        search && `search=${encodeURIComponent(search)}`,
      ]
        .filter(Boolean)
        .join("&");
      return authedFetch<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts/admin/list?${query}`,
      );
    },
  });

  // Tab counts are non-critical — the tabs render without them on failure.
  const statsQuery = useQuery({
    queryKey: queryKeys.postStats,
    queryFn: () => authedFetch<DashboardStatsResponse>("/v1/posts/admin/stats"),
  });

  const posts = postsQuery.data?.items ?? [];
  const pagination: PaginationMeta | null = postsQuery.data?.pagination ?? null;
  const stats = statsQuery.data ?? null;
  const isLoading = postsQuery.isPending;
  const error = postsQuery.isError
    ? postsQuery.error instanceof ApiRequestError
      ? postsQuery.error.message
      : "Failed to load posts."
    : "";

  // Deleting the last row of the final page leaves it empty — snap back to the
  // last page that still has results (was an early-return in the old fetch).
  // Adjusting state during render is React's sanctioned pattern here: it
  // converges in one extra render and avoids an effect (and an empty flash).
  if (
    postsQuery.data &&
    postsQuery.data.items.length === 0 &&
    page > 1 &&
    postsQuery.data.pagination.total > 0
  ) {
    setPage(Math.max(1, postsQuery.data.pagination.totalPages));
  }

  // Mutations move posts between tabs, so both the list and counts refresh.
  // The mutated post's own cached detail goes too: ["posts"] does not match
  // ["post", id], so leaving it behind means opening Edit next shows the
  // pre-mutation status until the page is reloaded.
  const refreshAfterMutation = (postId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.postStats });
    if (postId) {
      queryClient.removeQueries({ queryKey: queryKeys.post(postId) });
    }
  };

  const selectTab = (tab: StatusTab) => {
    setStatusTab(tab);
    setPage(1);
  };

  const transitionMutation = useMutation({
    mutationFn: (vars: { post: PostSummaryResponse; action: StatusAction }) =>
      authedFetch<PostDetailResponse>(
        `/v1/posts/${vars.post.id}/${vars.action}`,
        { method: "POST" },
      ),
  });

  const deleteMutation = useMutation({
    // The backend responds 200 { success: true } with no data field —
    // apiRequest resolves that to undefined, which <void> accepts.
    mutationFn: (id: string) =>
      authedFetch<void>(`/v1/posts/${id}`, { method: "DELETE" }),
  });

  // Throws on failure so the publish dialog can stay open; the direct
  // (dialog-less) callers catch and toast themselves.
  async function transitionStatus(
    post: PostSummaryResponse,
    action: StatusAction,
    successMessage: string,
  ) {
    setPendingId(post.id);
    try {
      await transitionMutation.mutateAsync({ post, action });
      await revalidatePublicContent("posts", getAccessToken());
      toast.success(successMessage);
      refreshAfterMutation(post.id);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDirectTransition(
    post: PostSummaryResponse,
    action: StatusAction,
    successMessage: string,
  ) {
    try {
      await transitionStatus(post, action, successMessage);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : `Failed to ${action} post.`,
      );
    }
  }

  async function handlePublishConfirm() {
    if (!publishTarget) return;
    try {
      await transitionStatus(
        publishTarget,
        "publish",
        "Post published successfully",
      );
      setPublishTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to publish post.",
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    setPendingId(deletedId);
    try {
      await deleteMutation.mutateAsync(deletedId);
      await revalidatePublicContent("posts", getAccessToken());
      toast.success("Post deleted successfully");
      setDeleteTarget(null);
      refreshAfterMutation(deletedId);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Failed to delete post.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handlePreview(post: PostSummaryResponse) {
    setPendingId(post.id);
    try {
      await openPostPreview(post, authedFetch);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to generate preview link.",
      );
    } finally {
      setPendingId(null);
    }
  }

  const isSearching = search.length > 0;
  const totalPages = pagination?.totalPages ?? 0;
  const rangeStart = pagination
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  const newPostButton = (
    <Link
      href="/admin/posts/new"
      className="inline-flex items-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal"
    >
      <Plus size={16} />
      New Post
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            Posts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, publish, and organize your articles.
          </p>
        </div>
        {newPostButton}
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => {
          const active = tab.key === statusTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-teal text-brand-teal"
                  : "border-transparent text-gray-500 hover:text-brand-teal"
              }`}
            >
              {tab.label}
              {stats && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {tab.count(stats)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mt-6 w-full max-w-xs">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search posts…"
          aria-label="Search posts"
          className="pl-9"
        />
      </div>

      {error && (
        <FormMessage type="error" className="mt-6" message={error} />
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner size={18} />
          Loading posts…
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12">
              <p className="text-sm text-gray-400">
                {isSearching
                  ? "No posts match your search."
                  : EMPTY_MESSAGE[statusTab]}
              </p>
              {statusTab === "ALL" && !isSearching && newPostButton}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Title
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Category
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Published
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Views
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const isPending = pendingId === post.id;
                    return (
                      <TableRow key={post.id}>
                        <TableCell className="max-w-xs px-6 py-4 text-sm font-medium text-brand-navy">
                          <span className="line-clamp-2">{post.title}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[post.status]}`}
                          >
                            {STATUS_LABEL[post.status]}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-500">
                          {post.category?.name ?? "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-500">
                          {post.publishedAt
                            ? formatPostDate(post.publishedAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right text-sm text-gray-500">
                          {post.viewCount.toLocaleString("en-US")}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/posts/${post.id}/edit`}
                              aria-label={`Edit ${post.title}`}
                              className="p-1 text-gray-400 transition-colors hover:text-brand-teal"
                            >
                              <Pencil size={16} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(post)}
                              disabled={isPending}
                              aria-label={`Delete ${post.title}`}
                              className="p-1 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={isPending}
                                aria-label={`More actions for ${post.title}`}
                                className="p-1 text-gray-400 transition-colors hover:text-brand-navy disabled:opacity-50"
                              >
                                {isPending ? (
                                  <Spinner size={16} />
                                ) : (
                                  <MoreVertical size={16} />
                                )}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/admin/posts/${post.id}/edit`)
                                  }
                                >
                                  <Pencil size={16} />
                                  Edit Post
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    void handlePreview(post);
                                  }}
                                >
                                  <Eye size={16} />
                                  Preview Post
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* The backend allows every status transition
                                    (applyStatus has no legality guard), but the
                                    newsletter only fires on DRAFT → PUBLISHED. */}
                                {post.status !== "PUBLISHED" && (
                                  <DropdownMenuItem
                                    onClick={() => setPublishTarget(post)}
                                  >
                                    <Send size={16} />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {post.status === "PUBLISHED" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void handleDirectTransition(
                                        post,
                                        "unpublish",
                                        "Post unpublished successfully",
                                      );
                                    }}
                                  >
                                    <Undo2 size={16} />
                                    Unpublish
                                  </DropdownMenuItem>
                                )}
                                {post.status === "ARCHIVED" ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void handleDirectTransition(
                                        post,
                                        "unpublish",
                                        "Post restored to draft",
                                      );
                                    }}
                                  >
                                    <ArchiveRestore size={16} />
                                    Restore to Draft
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      void handleDirectTransition(
                                        post,
                                        "archive",
                                        "Post archived successfully",
                                      );
                                    }}
                                  >
                                    <Archive size={16} />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(post)}
                                >
                                  <Trash2 size={16} />
                                  Delete Post
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination footer */}
              {pagination && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
                  <p className="text-sm text-gray-500">
                    Showing {rangeStart} to {rangeEnd} of {pagination.total}{" "}
                    results
                  </p>
                  {totalPages > 1 && (
                    <nav
                      className="flex items-center gap-1"
                      aria-label="Pagination"
                    >
                      <button
                        type="button"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {getPageNumbers(page, totalPages).map((p, index) =>
                        p === "…" ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-sm text-gray-400"
                            aria-hidden="true"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            aria-current={p === page ? "page" : undefined}
                            aria-label={`Page ${p}`}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              p === page
                                ? "border-brand-teal-dark bg-brand-teal-dark text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {publishTarget && (
        <PublishPostDialog
          postTitle={publishTarget.title}
          showNewsletterWarning={publishTarget.status === "DRAFT"}
          onOpenChange={(open) => {
            if (!open) setPublishTarget(null);
          }}
          onConfirm={handlePublishConfirm}
        />
      )}

      {deleteTarget && (
        <DeleteEntityDialog
          entityLabel="Post"
          entityName={deleteTarget.title}
          warning={
            deleteTarget.status === "PUBLISHED"
              ? "This post is currently published and publicly visible."
              : null
          }
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// useSearchParams requires a Suspense boundary for the static shell.
export default function AdminPostsPage() {
  return (
    <Suspense fallback={null}>
      <ManagePosts />
    </Suspense>
  );
}
