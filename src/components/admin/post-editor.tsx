"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidatePublicContent } from "@/lib/revalidate";
import { openPostPreview } from "@/lib/post-preview";
import {
  MAX_EXCERPT_LENGTH,
  MAX_META_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
} from "@/lib/constants";
import RichTextEditor from "@/components/admin/rich-text-editor";
import WordImport, {
  type WordImportResult,
} from "@/components/admin/word-import";
import MediaPickerDialog from "@/components/admin/media-picker-dialog";
import TagCombobox from "@/components/admin/tag-combobox";
import PublishPostDialog from "@/components/admin/publish-post-dialog";
import type { CategoryResponse } from "@/types/category";
import type { TagResponse } from "@/types/tag";
import type { MediaResponse } from "@/types/media";
import type {
  FeaturedImageResponse,
  PostDetailResponse,
  PostStatus,
} from "@/types/post";

export const postFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  slug: z.string(),
  content: z
    .string()
    .refine(
      (html) => html.replace(/<[^>]*>/g, " ").trim().length > 0,
      "Content is required.",
    ),
  excerpt: z
    .string()
    .max(
      MAX_EXCERPT_LENGTH,
      `Excerpt must be ${MAX_EXCERPT_LENGTH} characters or fewer.`,
    ),
  categoryId: z.string(),
  tagIds: z.array(z.string()),
  featuredImageId: z.string().nullable(),
  metaTitle: z
    .string()
    .max(
      MAX_META_TITLE_LENGTH,
      `Meta title must be ${MAX_META_TITLE_LENGTH} characters or fewer.`,
    ),
  metaDescription: z
    .string()
    .max(
      MAX_META_DESCRIPTION_LENGTH,
      `Meta description must be ${MAX_META_DESCRIPTION_LENGTH} characters or fewer.`,
    ),
  featured: z.boolean(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

const EMPTY_FORM_VALUES: PostFormValues = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  categoryId: "",
  tagIds: [],
  featuredImageId: null,
  metaTitle: "",
  metaDescription: "",
  featured: false,
};

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

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

const cardClass = "rounded-lg border border-gray-200 bg-white p-5";

interface PostEditorProps {
  /** When set, the editor loads and edits an existing post. */
  postId?: string;
}

function formValuesFromPost(post: PostDetailResponse): PostFormValues {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt ?? "",
    categoryId: post.category?.id ?? "",
    tagIds: post.tags.map((tag) => tag.id),
    featuredImageId: post.featuredImage?.id ?? null,
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    featured: post.featured,
  };
}

export default function PostEditor({ postId }: PostEditorProps) {
  const router = useRouter();
  const { authedFetch, getAccessToken } = useAuth();
  const isEditMode = Boolean(postId);

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Backend 400/409 messages surfaced above the form.
  const [formError, setFormError] = useState("");
  const [featuredImage, setFeaturedImage] =
    useState<FeaturedImageResponse | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const titleValue = useWatch({ control, name: "title" });
  const excerptValue = useWatch({ control, name: "excerpt" });
  const metaTitleValue = useWatch({ control, name: "metaTitle" });
  const metaDescriptionValue = useWatch({ control, name: "metaDescription" });
  const selectedTagIds = useWatch({ control, name: "tagIds" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [categoriesData, tagsData, postData] = await Promise.all([
          authedFetch<CategoryResponse[]>("/v1/categories"),
          authedFetch<TagResponse[]>("/v1/tags"),
          postId
            ? authedFetch<PostDetailResponse>(`/v1/posts/admin/${postId}`)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setCategories(categoriesData);
        setTags(tagsData);
        if (postData) {
          setPost(postData);
          setFeaturedImage(postData.featuredImage);
          reset(formValuesFromPost(postData));
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load the editor.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, postId, reset]);

  // Warn before the tab closes with unsaved changes. Client-side router
  // navigations are deliberately not intercepted (kept simple on purpose).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function buildPayload(data: PostFormValues) {
    return {
      title: data.title,
      content: data.content,
      // Blank slug/excerpt are omitted so the server keeps/derives them.
      slug: data.slug.trim() || undefined,
      excerpt: data.excerpt.trim() || undefined,
      featuredImageId: data.featuredImageId,
      // Public category pages resolve posts through the post_categories
      // join, not the primary categoryId column — always send both.
      categoryId: data.categoryId || null,
      categoryIds: data.categoryId ? [data.categoryId] : [],
      tagIds: data.tagIds,
      // Empty meta fields reset to the server defaults (title / excerpt).
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      featured: data.featured,
    };
  }

  async function finishSave(successMessage: string) {
    await revalidatePublicContent("posts", getAccessToken());
    toast.success(successMessage);
    reset(undefined, { keepValues: true });
    router.push("/admin/posts");
  }

  function surfaceError(err: unknown) {
    setFormError(
      err instanceof ApiRequestError ? err.message : "Failed to save post.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCreate(data: PostFormValues, status: PostStatus) {
    setFormError("");
    try {
      await authedFetch<PostDetailResponse>("/v1/posts", {
        method: "POST",
        body: JSON.stringify({ ...buildPayload(data), status }),
      });
      await finishSave(
        status === "PUBLISHED"
          ? "Post published successfully"
          : "Draft saved successfully",
      );
    } catch (err) {
      surfaceError(err);
    }
  }

  // Status is never sent on updates — it is managed by the transition
  // endpoints so the newsletter logic stays in one backend path.
  async function submitEdit(data: PostFormValues, publishAfterSave: boolean) {
    if (!postId) return;
    setFormError("");
    try {
      await authedFetch<PostDetailResponse>(`/v1/posts/${postId}`, {
        method: "PATCH",
        body: JSON.stringify(buildPayload(data)),
      });
      if (publishAfterSave) {
        await authedFetch<PostDetailResponse>(`/v1/posts/${postId}/publish`, {
          method: "POST",
        });
      }
      await finishSave(
        publishAfterSave
          ? "Post published successfully"
          : "Post updated successfully",
      );
    } catch (err) {
      surfaceError(err);
    }
  }

  async function handlePreview() {
    if (!postId) return;
    setIsPreviewing(true);
    try {
      await openPostPreview(postId, authedFetch);
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to generate preview link.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  function toggleTag(tagId: string) {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setValue("tagIds", next, { shouldDirty: true });
  }

  // Read the current selection via getValues (not the closed-over watch value)
  // so async callbacks always append to the latest set.
  function selectTag(tagId: string) {
    const current = getValues("tagIds");
    if (current.includes(tagId)) return;
    setValue("tagIds", [...current, tagId], { shouldDirty: true });
  }

  // Inline tag creation: POST /v1/tags, then add the tag to the local list and
  // the selection. On a 409 (someone created a same-named tag between load and
  // now) re-fetch the list and select the existing match instead of erroring.
  async function createTag(name: string) {
    setIsCreatingTag(true);
    try {
      const created = await authedFetch<TagResponse>("/v1/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setTags((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      selectTag(created.id);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        try {
          const fresh = await authedFetch<TagResponse[]>("/v1/tags");
          setTags(fresh);
          const match = fresh.find(
            (tag) => tag.name.toLowerCase() === name.trim().toLowerCase(),
          );
          if (match) {
            selectTag(match.id);
          } else {
            toast.error("That tag already exists but could not be found.");
          }
        } catch {
          toast.error("Failed to refresh tags.");
        }
      } else {
        toast.error(
          err instanceof ApiRequestError ? err.message : "Failed to create tag.",
        );
      }
    } finally {
      setIsCreatingTag(false);
    }
  }

  // True when the content field holds visible text (mirrors the zod check),
  // used to warn before a Word import overwrites an in-progress draft.
  function hasContent() {
    return getValues("content").replace(/<[^>]*>/g, " ").trim().length > 0;
  }

  // Populate the form from a converted Word document, exactly as if typed:
  // setValue on content flows through the Controller into the editor's
  // setContent command. A leading H1 becomes the title, if present.
  function applyWordImport({ title, html }: WordImportResult) {
    setValue("content", html, { shouldDirty: true, shouldValidate: true });
    if (title) {
      setValue("title", title, { shouldDirty: true, shouldValidate: true });
    }
  }

  function selectFeaturedImage(media: MediaResponse) {
    setFeaturedImage({
      id: media.id,
      url: media.url,
      fileName: media.fileName,
    });
    setValue("featuredImageId", media.id, { shouldDirty: true });
    setShowMediaPicker(false);
  }

  function removeFeaturedImage() {
    setFeaturedImage(null);
    setValue("featuredImageId", null, { shouldDirty: true });
  }

  // Validate first; the confirmation dialog only opens on a valid form.
  const requestPublish = handleSubmit(() => setShowPublishConfirm(true));

  const confirmPublish = handleSubmit(async (data) => {
    setShowPublishConfirm(false);
    if (isEditMode) {
      await submitEdit(data, true);
    } else {
      await submitCreate(data, "PUBLISHED");
    }
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Loading editor…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-600">
          {loadError}
        </div>
        <Link
          href="/admin/posts"
          className="mt-4 inline-block text-sm font-medium text-brand-teal underline-offset-2 hover:underline"
        >
          Back to Posts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-28">
      <p className="text-sm text-gray-400">
        <Link href="/admin/posts" className="hover:text-brand-teal">
          Posts
        </Link>{" "}
        <span className="mx-1">/</span>{" "}
        <span className="text-brand-navy">
          {isEditMode ? "Edit Post" : "Create New Post"}
        </span>
      </p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-brand-navy">
        {isEditMode ? "Edit Post" : "Create New Post"}
      </h1>

      {formError && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-600">
          {formError}
        </div>
      )}

      {/* Word import only populates the create form; editing an existing post
          starts from its saved content, so there is nothing to import into. */}
      {!isEditMode && (
        <div className="mt-6">
          <WordImport
            onImport={applyWordImport}
            hasExistingContent={hasContent}
          />
        </div>
      )}

      <form noValidate className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-8">
          <div className={cardClass}>
            <input
              {...register("title")}
              placeholder="Enter Post Title..."
              aria-label="Post title"
              className="w-full border-none bg-transparent p-0 font-serif text-2xl font-bold text-brand-navy placeholder:text-gray-300 focus:outline-none focus:ring-0"
            />
            {errors.title && (
              <p className="mt-2 text-xs text-red-600">{errors.title.message}</p>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
              <span className="shrink-0">/blog/</span>
              <input
                {...register("slug")}
                placeholder="post-slug-here"
                aria-label="Post slug"
                className="min-w-0 flex-1 border-b border-dashed border-gray-300 bg-transparent px-1 py-0.5 focus:border-brand-teal focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isEditMode
                ? "Leave blank to keep the current slug."
                : "Leave blank to auto-generate from the title."}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          {errors.content && (
            <p className="-mt-4 text-xs text-red-600">{errors.content.message}</p>
          )}

          <div className={cardClass}>
            <label
              htmlFor="excerpt"
              className="flex items-center justify-between text-sm font-medium text-gray-700"
            >
              <span>Excerpt</span>
              <span className="text-xs font-normal text-gray-400">
                {excerptValue.length}/{MAX_EXCERPT_LENGTH}
              </span>
            </label>
            <textarea
              id="excerpt"
              rows={3}
              maxLength={MAX_EXCERPT_LENGTH}
              {...register("excerpt")}
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave blank to auto-generate from content.
            </p>
            {errors.excerpt && (
              <p className="mt-1 text-xs text-red-600">
                {errors.excerpt.message}
              </p>
            )}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-4">
          <div className={cardClass}>
            <h2 className="font-serif text-base font-bold text-brand-navy">
              Featured Image
            </h2>
            {featuredImage ? (
              <div className="relative mt-3 overflow-hidden rounded-md border border-gray-200">
                <div className="relative aspect-video w-full bg-gray-100">
                  <Image
                    src={featuredImage.url}
                    alt="Featured image preview"
                    fill
                    sizes="(max-width: 1024px) 100vw, 360px"
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeFeaturedImage}
                  aria-label="Remove featured image"
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-gray-500 shadow transition-colors hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 py-8 text-gray-400 transition-colors hover:border-brand-teal hover:text-brand-teal"
              >
                <ImagePlus size={24} />
                <span className="text-sm font-medium">Click to select</span>
                <span className="text-xs">PNG, JPG, WEBP (Max 5MB)</span>
              </button>
            )}
            {featuredImage && (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="mt-2 text-xs font-medium text-brand-teal underline-offset-2 hover:underline"
              >
                Change image
              </button>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="font-serif text-base font-bold text-brand-navy">
              Category
            </h2>
            <select
              {...register("categoryId")}
              aria-label="Primary category"
              className={`mt-3 ${inputClass}`}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className={cardClass}>
            <h2 className="font-serif text-base font-bold text-brand-navy">
              Tags
            </h2>
            <TagCombobox
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggle={toggleTag}
              onCreate={createTag}
              isCreating={isCreatingTag}
            />
          </div>

          <div className={cardClass}>
            <h2 className="font-serif text-base font-bold text-brand-navy">
              SEO
            </h2>
            <div className="mt-3">
              <label
                htmlFor="metaTitle"
                className="flex items-center justify-between text-sm font-medium text-gray-700"
              >
                <span>Meta Title</span>
                <span className="text-xs font-normal text-gray-400">
                  {metaTitleValue.length}/{MAX_META_TITLE_LENGTH}
                </span>
              </label>
              <input
                id="metaTitle"
                {...register("metaTitle")}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Defaults to the post title.
              </p>
              {errors.metaTitle && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.metaTitle.message}
                </p>
              )}
            </div>
            <div className="mt-4">
              <label
                htmlFor="metaDescription"
                className="flex items-center justify-between text-sm font-medium text-gray-700"
              >
                <span>Meta Description</span>
                <span className="text-xs font-normal text-gray-400">
                  {metaDescriptionValue.length}/{MAX_META_DESCRIPTION_LENGTH}
                </span>
              </label>
              <textarea
                id="metaDescription"
                rows={3}
                {...register("metaDescription")}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-gray-400">
                Defaults to the excerpt.
              </p>
              {errors.metaDescription && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.metaDescription.message}
                </p>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                {...register("featured")}
                className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span className="text-sm font-medium text-gray-700">
                Feature this post on the home page
              </span>
            </label>
          </div>
        </div>
      </form>

      {/* ── Bottom action bar ────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4 md:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                isDirty ? "bg-amber-500" : "bg-gray-300"
              }`}
            />
            <span className={isDirty ? "text-amber-600" : "text-gray-400"}>
              {isDirty ? "Unsaved changes" : "No unsaved changes"}
            </span>
            {post && (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[post.status]}`}
              >
                {STATUS_LABEL[post.status]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handlePreview();
                  }}
                  disabled={isPreviewing || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {isPreviewing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Eye size={16} />
                  )}
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit((data) => submitEdit(data, false))();
                  }}
                  disabled={isSubmitting}
                  className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    post?.status === "DRAFT"
                      ? "bg-brand-navy hover:bg-brand-navy/90"
                      : "bg-brand-teal-dark hover:bg-brand-teal"
                  }`}
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </button>
                {post?.status === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => {
                      void requestPublish();
                    }}
                    disabled={isSubmitting}
                    className="rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
                  >
                    Publish
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit((data) => submitCreate(data, "DRAFT"))();
                  }}
                  disabled={isSubmitting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving…" : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void requestPublish();
                  }}
                  disabled={isSubmitting}
                  className="rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
                >
                  Publish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showMediaPicker && (
        <MediaPickerDialog
          onOpenChange={(open) => {
            if (!open) setShowMediaPicker(false);
          }}
          onSelect={selectFeaturedImage}
        />
      )}

      {showPublishConfirm && (
        <PublishPostDialog
          postTitle={titleValue || "Untitled post"}
          // Only a DRAFT → PUBLISHED transition queues the newsletter; a new
          // post created as PUBLISHED does too.
          showNewsletterWarning={!isEditMode || post?.status === "DRAFT"}
          onOpenChange={(open) => {
            if (!open) setShowPublishConfirm(false);
          }}
          onConfirm={async () => {
            await confirmPublish();
          }}
        />
      )}
    </div>
  );
}
