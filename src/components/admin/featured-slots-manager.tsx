"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { toast } from "sonner";
import Spinner from "@/components/ui/spinner";
import FormMessage from "@/components/ui/form-message";
import FeaturedPostPicker from "@/components/admin/featured-post-picker";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-changes-guard";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiRequestError } from "@/lib/api";
import { FEATURED_SLOT_COUNT } from "@/lib/constants";
import { formatPostDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { revalidatePublicContent } from "@/lib/revalidate";
import type {
  FeaturedSlotsResponse,
  PostSummaryResponse,
  UpdateFeaturedSlotsPayload,
} from "@/types/post";

type SlotPost = PostSummaryResponse | null;

// Server errors name the offending entry as "slots[<index>].<field>". The
// payload always lists every slot in position order, so the index is the
// slot's position minus one.
const SLOT_FIELD_PATTERN = /^slots\[(\d+)\]/;

function slotsFromResponse(data: FeaturedSlotsResponse): SlotPost[] {
  return Array.from(
    { length: FEATURED_SLOT_COUNT },
    (_, index) =>
      data.slots.find((slot) => slot.position === index + 1)?.post ?? null,
  );
}

export function buildFeaturedSlotsPayload(
  slots: SlotPost[],
): UpdateFeaturedSlotsPayload {
  return {
    slots: slots.map((post, index) => ({
      position: index + 1,
      postId: post?.id ?? null,
    })),
  };
}

function sameLayout(left: SlotPost[], right: SlotPost[]): boolean {
  return left.every((post, index) => post?.id === right[index]?.id);
}

interface SaveErrors {
  general: string[];
  bySlot: Map<number, string[]>;
}

const NO_ERRORS: SaveErrors = { general: [], bySlot: new Map() };

function saveErrorsFrom(err: unknown): SaveErrors {
  if (!(err instanceof ApiRequestError)) {
    return { general: ["Failed to save featured posts."], bySlot: new Map() };
  }
  if (!err.details) {
    return { general: [err.message], bySlot: new Map() };
  }

  const errors: SaveErrors = { general: [], bySlot: new Map() };
  for (const issue of err.details) {
    const match = SLOT_FIELD_PATTERN.exec(issue.field);
    if (match) {
      const index = Number(match[1]);
      errors.bySlot.set(index, [...(errors.bySlot.get(index) ?? []), issue.message]);
    } else {
      errors.general.push(issue.message);
    }
  }
  return errors;
}

export default function FeaturedSlotsManager() {
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  // Edits live in `draft` until saved; null means "showing what the server
  // has", so a background refetch updates an untouched page by itself.
  const [draft, setDraft] = useState<SlotPost[] | null>(null);
  const [pickingIndex, setPickingIndex] = useState<number | null>(null);
  const [saveErrors, setSaveErrors] = useState<SaveErrors>(NO_ERRORS);

  const slotsQuery = useQuery({
    queryKey: queryKeys.featuredSlots,
    queryFn: () =>
      authedFetch<FeaturedSlotsResponse>("/v1/admin/featured-posts"),
  });

  const savedSlots = useMemo(
    () => (slotsQuery.data ? slotsFromResponse(slotsQuery.data) : null),
    [slotsQuery.data],
  );
  const slots = draft ?? savedSlots;
  const isDirty = Boolean(draft && savedSlots && !sameLayout(draft, savedSlots));

  useUnsavedChangesGuard(isDirty);

  const usedPositions = useMemo(() => {
    const map = new Map<string, number>();
    slots?.forEach((post, index) => {
      if (post) map.set(post.id, index + 1);
    });
    return map;
  }, [slots]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateFeaturedSlotsPayload) =>
      authedFetch<FeaturedSlotsResponse>("/v1/admin/featured-posts", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  });

  function updateSlots(change: (current: SlotPost[]) => SlotPost[]) {
    if (!slots) return;
    setDraft(change([...slots]));
    setSaveErrors(NO_ERRORS);
  }

  function move(index: number, offset: -1 | 1) {
    updateSlots((next) => {
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }

  function assign(index: number, post: SlotPost) {
    updateSlots((next) => {
      next[index] = post;
      return next;
    });
    setPickingIndex(null);
  }

  async function handleSave() {
    if (!slots || !isDirty) return;
    setSaveErrors(NO_ERRORS);
    try {
      const saved = await saveMutation.mutateAsync(
        buildFeaturedSlotsPayload(slots),
      );
      queryClient.setQueryData(queryKeys.featuredSlots, saved);
      setDraft(null);
      setPickingIndex(null);
      toast.success("Featured Insights saved");
      // Slotting a post also marks it featured, which the Manage Posts list
      // shows — refresh it alongside the public pages.
      queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
      await revalidatePublicContent("posts", getAccessToken());
    } catch (err) {
      setSaveErrors(saveErrorsFrom(err));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-navy">
            Featured Insights
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose and order up to {FEATURED_SLOT_COUNT} published posts for the
            home page. Featuring a post in the editor fills the first empty
            slot; removing a post here un-features it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-sm font-medium text-amber-700">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={!isDirty || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveMutation.isPending && <Spinner size={16} />}
            Save
          </button>
        </div>
      </div>

      {saveErrors.general.length > 0 && (
        <FormMessage
          type="error"
          className="mt-6"
          message={saveErrors.general.join(" ")}
        />
      )}

      {slotsQuery.isPending ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner size={18} />
          Loading featured posts…
        </div>
      ) : slotsQuery.isError || !slots ? (
        <FormMessage
          type="error"
          className="mt-6"
          message={
            slotsQuery.error instanceof ApiRequestError
              ? slotsQuery.error.message
              : "Failed to load featured posts."
          }
        />
      ) : (
        <ol className="mt-6 flex flex-col gap-3">
          {slots.map((post, index) => {
            const position = index + 1;
            const slotErrors = saveErrors.bySlot.get(index) ?? [];
            return (
              <li
                key={position}
                aria-label={`Slot ${position}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal">
                    {position}
                  </span>

                  <div className="min-w-0 flex-1">
                    {post ? (
                      <>
                        <p className="truncate text-sm font-medium text-brand-navy">
                          {post.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {[
                            post.category?.name ?? "Uncategorized",
                            post.publishedAt
                              ? formatPostDate(post.publishedAt)
                              : "Not published",
                          ].join(" · ")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Empty slot</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPickingIndex(pickingIndex === index ? null : index)
                      }
                      aria-expanded={pickingIndex === index}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      {post ? "Change" : "Choose post"}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move slot ${position} up`}
                      className="p-1.5 text-gray-400 transition-colors hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === slots.length - 1}
                      aria-label={`Move slot ${position} down`}
                      className="p-1.5 text-gray-400 transition-colors hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => assign(index, null)}
                      disabled={!post}
                      aria-label={`Clear slot ${position}`}
                      className="p-1.5 text-gray-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {pickingIndex === index && (
                  <FeaturedPostPicker
                    position={position}
                    usedPositions={usedPositions}
                    onSelect={(selected) => assign(index, selected)}
                    onCancel={() => setPickingIndex(null)}
                  />
                )}

                {slotErrors.length > 0 && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    {slotErrors.join(" ")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
