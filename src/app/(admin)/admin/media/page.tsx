"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare2,
  Link as LinkIcon,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidatePublicContent } from "@/lib/revalidate";
import { queryKeys } from "@/lib/query-keys";
import { formatFileSize, formatPostDate } from "@/lib/format";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import {
  prependMediaToCache,
  removeMediaFromCache,
  useMediaList,
} from "@/components/admin/use-media-list";
import MediaGridItem from "@/components/admin/media-grid-item";
import DeleteEntityDialog from "@/components/admin/delete-entity-dialog";
import { Input } from "@/components/ui/input";
import FormMessage from "@/components/ui/form-message";
import type { MediaKind, MediaResponse } from "@/types/media";

type MediaTypeFilter = "all" | MediaKind;

const TYPE_FILTERS: { value: MediaTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "document", label: "PDFs" },
];
export default function AdminMediaPage() {
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading, progress } = useMediaUpload();
  // The backend has no search param on GET /v1/media — filtering is
  // client-side over the pages fetched so far.
  const [search, setSearch] = useState("");
  // Kind filter uses the backend ?type param so each list is a separate cache.
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<MediaResponse | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The API returns media newest-first (createdAt DESC) — no client sort
  // needed. "All" shares the ["media"] key with the picker dialog, so an
  // upload from either surface shows in both. Paginated: pages accumulate
  // behind the "Load more" control below.
  const {
    items,
    total,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useMediaList(typeFilter);

  const filteredItems = search.trim()
    ? items.filter((media) =>
        media.originalName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : items;

  const selectedItems = items.filter((media) => selectedIds.has(media.id));
  const selectedCount = selectedItems.length;
  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((media) => selectedIds.has(media.id));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaById(id),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (targets: MediaResponse[]) => {
      const results = await Promise.allSettled(
        targets.map(async (media) => {
          await deleteMediaById(media.id);
          return media.id;
        }),
      );

      return results.map((result, index) => ({
        id: targets[index].id,
        ok: result.status === "fulfilled",
      }));
    },
  });

  function deleteMediaById(id: string) {
    return authedFetch<void>(`/v1/media/${id}`, { method: "DELETE" });
  }

  function removeMediaFromCachedLists(ids: string[]) {
    removeMediaFromCache(queryClient, ids);
  }

  function toggleMediaSelection(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredItems.forEach((media) => next.delete(media.id));
      } else {
        filteredItems.forEach((media) => next.add(media.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    // Each finished upload lands in the grid immediately, newest first, by
    // prepending to the shared ["media"] cache (which the picker also reads).
    // Library uploads are images, so refresh the image-filtered list too.
    void uploadFiles(files, (media) => {
      prependMediaToCache(queryClient, queryKeys.media, media);
      queryClient.invalidateQueries({ queryKey: queryKeys.mediaByType("image") });
    });
  }

  async function handleCopyUrl(media: MediaResponse) {
    try {
      await navigator.clipboard.writeText(media.url);
      toast.success("URL copied");
    } catch {
      toast.error("Failed to copy URL.");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      // Public pages may render the removed image on cards/articles.
      await revalidatePublicContent("posts", getAccessToken());
      toast.success("Media deleted successfully");
      removeMediaFromCachedLists([deleteTarget.id]);
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to delete media.",
      );
    }
  }

  async function handleBulkDeleteConfirm() {
    const targets = selectedItems;
    if (targets.length === 0) {
      setBulkDeleteOpen(false);
      return;
    }

    const results = await bulkDeleteMutation.mutateAsync(targets);
    const deletedIds = results
      .filter((result) => result.ok)
      .map((result) => result.id);
    const failedCount = results.length - deletedIds.length;

    if (deletedIds.length > 0) {
      // Public pages may render removed images on cards/articles.
      await revalidatePublicContent("posts", getAccessToken());
      removeMediaFromCachedLists(deletedIds);
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
      setSelectedIds((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    if (failedCount > 0) {
      toast.error(
        `${deletedIds.length} deleted, ${failedCount} failed. Please try again.`,
      );
    } else {
      toast.success(
        `${deletedIds.length} media ${deletedIds.length === 1 ? "item" : "items"} deleted successfully`,
      );
    }

    setBulkDeleteOpen(false);
  }

  const uploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isUploading}
      className="inline-flex items-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
    >
      {isUploading ? (
        <Spinner size={16} />
      ) : (
        <Upload size={16} />
      )}
      {isUploading && progress
        ? `Uploading ${progress.current} of ${progress.total}…`
        : "Upload Image"}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            Media
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage the images used across your articles.
          </p>
        </div>
        {uploadButton}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFilesChange}
        className="hidden"
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search media…"
            aria-label="Search media"
            className="pl-9"
          />
        </div>
        <div
          className="inline-flex rounded-md border border-gray-200 bg-white p-0.5"
          role="group"
          aria-label="Filter media by type"
        >
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setTypeFilter(filter.value);
                clearSelection();
              }}
              aria-pressed={typeFilter === filter.value}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === filter.value
                  ? "bg-brand-teal-dark text-white"
                  : "text-gray-600 hover:text-brand-teal"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {(filteredItems.length > 0 || selectedCount > 0) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleVisibleSelection}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allVisibleSelected ? (
                <CheckSquare2 size={16} />
              ) : (
                <Square size={16} />
              )}
              {allVisibleSelected ? "Unselect shown" : "Select shown"}
            </button>
            <span className="text-sm text-gray-500">
              {selectedCount} selected
            </span>
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-navy disabled:opacity-50"
              >
                <X size={16} />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {bulkDeleteMutation.isPending ? (
                  <Spinner size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete selected
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <FormMessage type="error" className="mt-6" message={error} />
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner size={18} />
          Loading media…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white px-6 py-12">
          <p className="text-sm text-gray-400">
            {search.trim() ? "No media match your search." : "No media yet."}
          </p>
          {!search.trim() && uploadButton}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((media) => (
            <MediaGridItem
              key={media.id}
              media={media}
              meta={`${formatFileSize(media.size)} · ${formatPostDate(media.createdAt)}`}
              selected={selectedIds.has(media.id)}
              onSelectionChange={(selected) =>
                toggleMediaSelection(media.id, selected)
              }
              selectionLabel={`Select ${media.originalName}`}
              selectionDisabled={bulkDeleteMutation.isPending}
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyUrl(media);
                    }}
                    aria-label={`Copy URL for ${media.originalName}`}
                    title="Copy URL"
                    className="rounded-md bg-white p-2 text-brand-navy shadow transition-colors hover:text-brand-teal"
                  >
                    <LinkIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(media)}
                    aria-label={`Delete ${media.originalName}`}
                    title="Delete"
                    className="rounded-md bg-white p-2 text-brand-navy shadow transition-colors hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      {/* The listing is paginated, so the grid above holds only the pages
          fetched so far. Without this the library would silently stop at the
          first 24 files and look like the whole library. */}
      {!isLoading && hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white disabled:opacity-60"
          >
            {isLoadingMore && <Spinner size={16} />}
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
          <p className="text-xs text-gray-400">
            Showing {items.length} of {total}
          </p>
        </div>
      )}

      {deleteTarget && (
        <DeleteEntityDialog
          entityLabel="Media"
          entityName={deleteTarget.originalName}
          warning="The file will be permanently removed from storage. If any post still uses it — as a featured image, inline in the body, or as a PDF link — the delete is refused and you'll be told which posts to update first."
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {bulkDeleteOpen && selectedCount > 0 && (
        <DeleteEntityDialog
          entityLabel="Selected Media"
          entityName={`${selectedCount} selected ${
            selectedCount === 1 ? "item" : "items"
          }`}
          warning={`The selected ${
            selectedCount === 1 ? "file" : "files"
          } will be permanently removed from storage. Any post using ${
            selectedCount === 1 ? "it" : "these files"
          } will lose ${
            selectedCount === 1 ? "it" : "them"
          } and fall back to a placeholder.`}
          onOpenChange={(open) => {
            if (!open) setBulkDeleteOpen(false);
          }}
          onConfirm={handleBulkDeleteConfirm}
        />
      )}
    </div>
  );
}
