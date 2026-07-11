"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as LinkIcon, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidatePublicContent } from "@/lib/revalidate";
import { queryKeys } from "@/lib/query-keys";
import { formatFileSize, formatPostDate } from "@/lib/format";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { useMediaUpload } from "@/components/admin/use-media-upload";
import MediaGridItem from "@/components/admin/media-grid-item";
import DeleteEntityDialog from "@/components/admin/delete-entity-dialog";
import { Input } from "@/components/ui/input";
import type { MediaResponse } from "@/types/media";

export default function AdminMediaPage() {
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading, progress } = useMediaUpload();
  // The backend has no search param on GET /v1/media — filtering is
  // client-side over the full list.
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The API returns media newest-first (createdAt DESC) — no client sort
  // needed. Shares the ["media"] key with the picker dialog, so an upload
  // from either surface shows in both.
  const mediaQuery = useQuery({
    queryKey: queryKeys.media,
    queryFn: () => authedFetch<MediaResponse[]>("/v1/media"),
  });

  const items = mediaQuery.data ?? [];
  const isLoading = mediaQuery.isPending;
  const error = mediaQuery.isError
    ? mediaQuery.error instanceof ApiRequestError
      ? mediaQuery.error.message
      : "Failed to load media."
    : "";

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch<void>(`/v1/media/${id}`, { method: "DELETE" }),
  });

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    // Each finished upload lands in the grid immediately, newest first, by
    // prepending to the shared ["media"] cache (which the picker also reads).
    void uploadFiles(files, (media) => {
      queryClient.setQueryData<MediaResponse[]>(queryKeys.media, (previous) => [
        media,
        ...(previous ?? []),
      ]);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to delete media.",
      );
    }
  }

  const filteredItems = search.trim()
    ? items.filter((media) =>
        media.originalName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : items;

  const uploadButton = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isUploading}
      className="inline-flex items-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
    >
      {isUploading ? (
        <Loader2 size={16} className="animate-spin" />
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

      <div className="relative mt-6 w-full max-w-xs">
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

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
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

      {deleteTarget && (
        <DeleteEntityDialog
          entityLabel="Media"
          entityName={deleteTarget.originalName}
          warning="The file will be permanently removed from storage. Any post using this image will lose it and fall back to a placeholder."
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
