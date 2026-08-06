"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, ImagePlus, X } from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidatePublicContent } from "@/lib/revalidate";
import { htmlToPlainText } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { openPostPreview } from "@/lib/post-preview";
import {
  MAX_EXCERPT_LENGTH,
  MAX_META_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
} from "@/lib/constants";
import RichTextEditor from "@/components/admin/rich-text-editor";
import EditorOutline from "@/components/admin/editor-outline";
import WordImport, {
  type WordImportResult,
} from "@/components/admin/word-import";
import MediaPickerDialog from "@/components/admin/media-picker-dialog";
import TagCombobox from "@/components/admin/tag-combobox";
import PublishPostDialog from "@/components/admin/publish-post-dialog";
import FormMessage from "@/components/ui/form-message";
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
  categoryIds: z.array(z.string()),
  tagIds: z.array(z.string()),
  // Required to PUBLISH (checked in requestPublish), but not to save a draft
  // or edit an existing post — so fixing an excerpt never gets blocked by a
  // missing image. The image is shown at the top of the published article.
  featuredImageId: z.string().nullable(),
  // Whether the featured image is shown at the top of the blog detail page.
  showFeaturedImage: z.boolean(),
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
  categoryIds: [],
  tagIds: [],
  featuredImageId: null,
  showFeaturedImage: true,
  metaTitle: "",
  metaDescription: "",
  featured: false,
};

// Backend validation `field` names match the form field names 1:1.
function isPostFormField(name: string): name is keyof PostFormValues {
  return name in EMPTY_FORM_VALUES;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

// Chip vocabulary shared with the public pages: the taxonomy pill for neutral
// states, palette teal for live content, muted amber for retired content.
const STATUS_BADGE_CLASS: Record<PostStatus, string> = {
  PUBLISHED:
    "border-brand-teal-dark/20 bg-brand-teal-dark/10 text-brand-teal-dark",
  DRAFT: "border-[#d3e1f6] bg-[#d3e1f6] text-[#566475]",
  ARCHIVED: "border-amber-200/70 bg-amber-50 text-amber-800",
};

// The article pages' small-caps label, reused for field labels and eyebrows.
const LABEL_CAPS =
  "text-[12px] font-semibold uppercase tracking-[0.1em] text-[#566475]";

// Serif teal card heading, matching "Contents" on the public chapter pages.
const CARD_HEADING = "font-serif text-[18px] font-semibold text-brand-teal-dark";

const HELP_TEXT = "mt-1.5 text-[13px] leading-relaxed text-[#566475]";

const ERROR_TEXT = "mt-1.5 text-[12px] text-red-600";

const inputClass =
  "w-full rounded border border-brand-muted bg-white px-3 py-2 text-[14px] text-[#121c2a] " +
  "placeholder:text-[#566475]/70 focus:border-brand-teal-dark focus:outline-none focus:ring-1 focus:ring-brand-teal-dark";

const cardClass =
  "rounded-xl border border-brand-muted bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)]";

const checkboxClass =
  "h-4 w-4 shrink-0 rounded border-brand-muted accent-brand-teal-dark focus:ring-brand-teal-dark";

// The dark pill from the public "Start reading" CTA, for the one action that
// commits the post.
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded bg-[#121c2a] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const TEAL_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded bg-brand-teal-dark px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-teal disabled:opacity-60";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded border border-brand-muted bg-white px-5 py-2.5 text-[14px] font-medium text-[#121c2a] transition-colors hover:border-brand-teal-dark hover:text-brand-teal-dark disabled:opacity-50";

interface PostEditorProps {
  /** When set, the editor loads and edits an existing post. */
  postId?: string;
}

function formValuesFromPost(post: PostDetailResponse): PostFormValues {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content,
    // Strip any HTML from a legacy excerpt (older posts stored the
    // auto-generated excerpt with raw markup) so the field shows plain text.
    excerpt: post.excerpt ? htmlToPlainText(post.excerpt) : "",
    // Prefer the many-to-many categories; fall back to the legacy single
    // category so posts created before multi-category still load correctly.
    categoryIds:
      post.categories.length > 0
        ? post.categories.map((category) => category.id)
        : post.category
          ? [post.category.id]
          : [],
    tagIds: post.tags.map((tag) => tag.id),
    featuredImageId: post.featuredImage?.id ?? null,
    showFeaturedImage: post.showFeaturedImage,
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    featured: post.featured,
  };
}

export default function PostEditor({ postId }: PostEditorProps) {
  const router = useRouter();
  const { authedFetch, getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(postId);

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
    setError,
    clearErrors,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  // Wraps the rich-text editor so the outline can scroll to a heading by
  // index. Headings render as `p.heading-<level>` (see
  // lib/tiptap/heading-paragraph-extension.ts) and are in the same order as
  // parseHeadings, so the two must cover the same set of levels.
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  // Lets a failed publish (missing featured image) scroll the field into view.
  const featuredImageRef = useRef<HTMLDivElement>(null);

  const titleValue = useWatch({ control, name: "title" });
  const contentValue = useWatch({ control, name: "content" });
  const excerptValue = useWatch({ control, name: "excerpt" });
  const metaTitleValue = useWatch({ control, name: "metaTitle" });
  const metaDescriptionValue = useWatch({ control, name: "metaDescription" });
  const selectedTagIds = useWatch({ control, name: "tagIds" });
  const selectedCategoryIds = useWatch({ control, name: "categoryIds" });

  // Reference lists share the SAME query keys as the Manage Categories/Tags
  // screens (see src/lib/query-keys.ts), so a create/edit there shows here
  // without a reload, and inline tag creation here shows there.
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => authedFetch<CategoryResponse[]>("/v1/categories"),
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => authedFetch<TagResponse[]>("/v1/tags"),
  });
  const postQuery = useQuery({
    queryKey: queryKeys.post(postId ?? ""),
    queryFn: () => authedFetch<PostDetailResponse>(`/v1/posts/admin/${postId}`),
    enabled: isEditMode,
  });

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const post = postQuery.data ?? null;

  // The editor renders only once its reference data (and, in edit mode, the
  // post) has loaded — same gate as the old single Promise.all.
  const isLoading =
    categoriesQuery.isPending ||
    tagsQuery.isPending ||
    (isEditMode && postQuery.isPending);

  const loadErrorSource =
    categoriesQuery.error ??
    tagsQuery.error ??
    (isEditMode ? postQuery.error : null);
  const loadError = loadErrorSource
    ? loadErrorSource instanceof ApiRequestError
      ? loadErrorSource.message
      : "Failed to load the editor."
    : "";

  // Seed the form from the fetched post exactly once per loaded post. Guarded
  // by id so a background refetch (refetchOnWindowFocus is on) never discards
  // unsaved edits by re-running reset — matching the old one-shot fetch.
  const appliedPostIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = postQuery.data;
    if (data && appliedPostIdRef.current !== data.id) {
      appliedPostIdRef.current = data.id;
      setFeaturedImage(data.featuredImage);
      reset(formValuesFromPost(data));
    }
  }, [postQuery.data, reset]);

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
      showFeaturedImage: data.showFeaturedImage,
      // Public category pages resolve posts through the post_categories
      // join. Send the full set, and keep the legacy primary categoryId in
      // sync (first selected) for any code path that still reads it.
      categoryId: data.categoryIds[0] ?? null,
      categoryIds: data.categoryIds,
      tagIds: data.tagIds,
      // Empty meta fields reset to the server defaults (title / excerpt).
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      featured: data.featured,
    };
  }

  const createPostMutation = useMutation({
    mutationFn: (
      payload: ReturnType<typeof buildPayload> & { status: PostStatus },
    ) =>
      authedFetch<PostDetailResponse>("/v1/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

  // Status is never sent on updates — it is managed by the transition
  // endpoints so the newsletter logic stays in one backend path.
  const updatePostMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      payload: ReturnType<typeof buildPayload>;
    }) =>
      authedFetch<PostDetailResponse>(`/v1/posts/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.payload),
      }),
  });

  const publishPostMutation = useMutation({
    mutationFn: (id: string) =>
      authedFetch<PostDetailResponse>(`/v1/posts/${id}/publish`, {
        method: "POST",
      }),
  });

  async function finishSave(successMessage: string) {
    // Purge the PUBLIC site's Next.js cache exactly as before — React Query
    // does not know about it and does not replace it.
    await revalidatePublicContent("posts", getAccessToken());
    // Refresh the admin's own list and stats so Manage Posts / Dashboard
    // reflect the change if the admin navigates back to them.
    queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.postStats });
    toast.success(successMessage);
    reset(undefined, { keepValues: true });
    router.push("/admin/posts");
  }

  function surfaceError(err: unknown) {
    if (!(err instanceof ApiRequestError)) {
      setFormError("Failed to save post.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const unmatched: string[] = [];
    let matchedAny = false;
    for (const issue of err.details ?? []) {
      if (isPostFormField(issue.field)) {
        setError(issue.field, { type: "server", message: issue.message });
        matchedAny = true;
      } else {
        unmatched.push(issue.message);
      }
    }

    if (unmatched.length > 0) {
      setFormError([err.message, ...unmatched].join(" "));
    } else if (matchedAny) {
      setFormError("Please fix the highlighted field(s) below.");
    } else {
      setFormError(err.message);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCreate(data: PostFormValues, status: PostStatus) {
    setFormError("");
    try {
      await createPostMutation.mutateAsync({ ...buildPayload(data), status });
      await finishSave(
        status === "PUBLISHED"
          ? "Post published successfully"
          : "Draft saved successfully",
      );
    } catch (err) {
      surfaceError(err);
    }
  }

  async function submitEdit(data: PostFormValues, publishAfterSave: boolean) {
    if (!postId) return;
    setFormError("");
    try {
      await updatePostMutation.mutateAsync({
        id: postId,
        payload: buildPayload(data),
      });
      if (publishAfterSave) {
        await publishPostMutation.mutateAsync(postId);
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
    if (!post) return;
    setIsPreviewing(true);
    try {
      await openPostPreview(post, authedFetch);
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

  function toggleCategory(categoryId: string) {
    const next = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setValue("categoryIds", next, { shouldDirty: true });
  }

  // Read the current selection via getValues (not the closed-over watch value)
  // so async callbacks always append to the latest set.
  function selectTag(tagId: string) {
    const current = getValues("tagIds");
    if (current.includes(tagId)) return;
    setValue("tagIds", [...current, tagId], { shouldDirty: true });
  }

  // Inline tag creation: POST /v1/tags, then add the tag to the shared
  // ["tags"] cache (so Manage Tags reflects it too) and the selection. On a
  // 409 (someone created a same-named tag between load and now) re-fetch the
  // list and select the existing match instead of erroring.
  async function createTag(name: string) {
    setIsCreatingTag(true);
    try {
      const created = await authedFetch<TagResponse>("/v1/tags", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      queryClient.setQueryData<TagResponse[]>(queryKeys.tags, (prev) =>
        [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      selectTag(created.id);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        try {
          const fresh = await authedFetch<TagResponse[]>("/v1/tags");
          queryClient.setQueryData<TagResponse[]>(queryKeys.tags, fresh);
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
          err instanceof ApiRequestError
            ? err.message
            : "Failed to create tag.",
        );
      }
    } finally {
      setIsCreatingTag(false);
    }
  }

  // True when the content field holds visible text (mirrors the zod check),
  // used to warn before a Word import overwrites an in-progress draft.
  function hasContent() {
    return (
      getValues("content")
        .replace(/<[^>]*>/g, " ")
        .trim().length > 0
    );
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

  // Jump the editor to a heading picked in the outline. Headings carry no ids
  // inside the editor (those are injected only at render time), so match by
  // document order against the live h2/h3 elements.
  function scrollToHeading(index: number) {
    const headings = editorWrapperRef.current?.querySelectorAll<HTMLElement>(
      "p.heading-1, p.heading-2, p.heading-3",
    );
    headings?.[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function selectFeaturedImage(media: MediaResponse) {
    setFeaturedImage({
      id: media.id,
      url: media.url,
      fileName: media.fileName,
    });
    setValue("featuredImageId", media.id, { shouldDirty: true });
    clearErrors("featuredImageId");
    setShowMediaPicker(false);
  }

  function removeFeaturedImage() {
    setFeaturedImage(null);
    setValue("featuredImageId", null, { shouldDirty: true });
  }

  // Validate first; the confirmation dialog only opens on a valid form. A
  // featured image is required to publish (but not to save a draft/edit), so
  // enforce it here with a visible message rather than failing silently.
  function requestPublish() {
    void handleSubmit((data) => {
      if (!data.featuredImageId) {
        setError("featuredImageId", {
          type: "required",
          message: "A featured image is required to publish.",
        });
        toast.error("Add a featured image before publishing.");
        featuredImageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      setShowPublishConfirm(true);
    })();
  }

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
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mt-10 flex items-center justify-center gap-2 text-[14px] text-[#44474c]">
          <Spinner size={18} />
          Loading editor…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <FormMessage type="error" message={loadError} />
        <Link
          href="/admin/posts"
          className="mt-4 inline-block text-[14px] font-medium text-brand-teal-dark underline-offset-2 hover:underline"
        >
          Back to Posts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl bg-white px-6 py-12 pb-28 text-[#121c2a]">
      <p className={`flex flex-wrap items-center gap-2 ${LABEL_CAPS}`}>
        <Link
          href="/admin/posts"
          className="transition-colors hover:text-brand-teal-dark"
        >
          Posts
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-brand-teal-dark">
          {isEditMode ? "Edit Post" : "Create New Post"}
        </span>
      </p>
      <h1 className="mt-3 font-serif text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[#121c2a] md:text-[40px]">
        {isEditMode ? "Edit Post" : "Create New Post"}
      </h1>
      {/* Short rule under the title, as on the article pages. */}
      <div className="mt-4 h-px w-24 bg-brand-muted" />

      {formError && (
        <FormMessage type="error" className="mt-6" message={formError} />
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
            <label htmlFor="post-title" className={LABEL_CAPS}>
              Title
            </label>
            <input
              id="post-title"
              {...register("title")}
              placeholder="Enter Post Title..."
              aria-label="Post title"
              className="mt-2 w-full border-none bg-transparent p-0 font-serif text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[#121c2a] placeholder:text-brand-muted focus:outline-none focus:ring-0"
            />
            {errors.title && (
              <p className={ERROR_TEXT}>{errors.title.message}</p>
            )}

            <div className="mt-5 flex items-center gap-2 rounded border border-brand-muted bg-[#f8f9ff] px-3 py-2 font-mono text-[12px] text-[#566475]">
              <span className="shrink-0">/blogs/</span>
              <input
                {...register("slug")}
                placeholder="post-slug-here"
                aria-label="Post slug"
                className="min-w-0 flex-1 border-b border-dashed border-brand-muted bg-transparent px-1 py-0.5 text-[#121c2a] focus:border-brand-teal-dark focus:outline-none"
              />
            </div>
            <p className={HELP_TEXT}>
              {isEditMode
                ? "Leave blank to keep the current slug."
                : "Leave blank to auto-generate from the title."}
            </p>
          </div>

          <div
            ref={editorWrapperRef}
            className="overflow-hidden rounded-xl border border-brand-muted bg-white shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
          >
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          {errors.content && (
            <p className="-mt-4 text-[12px] text-red-600">
              {errors.content.message}
            </p>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-4">
          <div className={cardClass}>
            <label
              htmlFor="excerpt"
              className={`flex items-center justify-between ${LABEL_CAPS}`}
            >
              <span>Excerpt</span>
              <span className="font-normal tracking-normal text-brand-muted">
                {excerptValue.length}/{MAX_EXCERPT_LENGTH}
              </span>
            </label>
            <textarea
              id="excerpt"
              rows={4}
              maxLength={MAX_EXCERPT_LENGTH}
              {...register("excerpt")}
              className={`mt-2 ${inputClass}`}
            />
            <p className={HELP_TEXT}>
              Leave blank to auto-generate from content.
            </p>
            {errors.excerpt && (
              <p className={ERROR_TEXT}>{errors.excerpt.message}</p>
            )}
          </div>

          <div className={`${cardClass} max-h-96 overflow-y-auto`}>
            <h2 className={CARD_HEADING}>Table of Contents</h2>
            <EditorOutline content={contentValue} onSelect={scrollToHeading} />
          </div>

          <div ref={featuredImageRef} className={cardClass}>
            <h2 className={CARD_HEADING}>
              Featured Image{" "}
              <span className="text-red-500" title="Required to publish">
                *
              </span>
            </h2>
            {featuredImage ? (
              <div className="relative mt-4 overflow-hidden rounded-lg border border-brand-muted">
                <div className="relative aspect-video w-full bg-[#d5e4f8]">
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
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-[#566475] shadow transition-colors hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-muted py-10 text-[#566475] transition-colors hover:border-brand-teal-dark hover:text-brand-teal-dark"
              >
                <ImagePlus size={24} />
                <span className="text-[14px] font-medium">Click to select</span>
                <span className="text-[12px]">PNG, JPG, WEBP (Max 5MB)</span>
              </button>
            )}
            {featuredImage && (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="mt-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-teal-dark underline-offset-2 hover:underline"
              >
                Change image
              </button>
            )}
            {errors.featuredImageId && (
              <p className={ERROR_TEXT}>{errors.featuredImageId.message}</p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 border-t border-brand-muted/50 pt-5">
              <input
                type="checkbox"
                {...register("showFeaturedImage")}
                className={`mt-0.5 ${checkboxClass}`}
              />
              <span className="text-[14px] text-[#121c2a]">
                <span className="font-medium">Show at top of post</span>
                <span className={`block ${HELP_TEXT}`}>
                  Display this image below the title on the blog detail page.
                  Untick to hide it there (it still appears in post listings).
                </span>
              </span>
            </label>
          </div>

          <div className={cardClass}>
            <h2 className={CARD_HEADING}>Categories</h2>
            <p className={HELP_TEXT}>
              Select one or more categories for this post.
            </p>
            {categories.length === 0 ? (
              <p className="mt-4 text-[14px] text-[#566475]">
                No categories yet. Create one under Manage Categories.
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-3 text-[14px] text-[#121c2a]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className={checkboxClass}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={cardClass}>
            <h2 className={`mb-2 ${CARD_HEADING}`}>Tags</h2>
            <TagCombobox
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggle={toggleTag}
              onCreate={createTag}
              isCreating={isCreatingTag}
            />
          </div>

          <div className={cardClass}>
            <h2 className={CARD_HEADING}>SEO</h2>
            <div className="mt-4">
              <label
                htmlFor="metaTitle"
                className={`flex items-center justify-between ${LABEL_CAPS}`}
              >
                <span>Meta Title</span>
                <span className="font-normal tracking-normal text-brand-muted">
                  {metaTitleValue.length}/{MAX_META_TITLE_LENGTH}
                </span>
              </label>
              <input
                id="metaTitle"
                {...register("metaTitle")}
                className={`mt-2 ${inputClass}`}
              />
              <p className={HELP_TEXT}>Defaults to the post title.</p>
              {errors.metaTitle && (
                <p className={ERROR_TEXT}>{errors.metaTitle.message}</p>
              )}
            </div>
            <div className="mt-5">
              <label
                htmlFor="metaDescription"
                className={`flex items-center justify-between ${LABEL_CAPS}`}
              >
                <span>Meta Description</span>
                <span className="font-normal tracking-normal text-brand-muted">
                  {metaDescriptionValue.length}/{MAX_META_DESCRIPTION_LENGTH}
                </span>
              </label>
              <textarea
                id="metaDescription"
                rows={3}
                {...register("metaDescription")}
                className={`mt-2 ${inputClass}`}
              />
              <p className={HELP_TEXT}>Defaults to the excerpt.</p>
              {errors.metaDescription && (
                <p className={ERROR_TEXT}>{errors.metaDescription.message}</p>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                {...register("featured")}
                className={checkboxClass}
              />
              <span className="text-[14px] font-medium text-[#121c2a]">
                Feature this post on the home page
              </span>
            </label>
          </div>
        </div>
      </form>

      {/* ── Bottom action bar ────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-muted bg-white px-6 py-4 md:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                isDirty ? "bg-amber-500" : "bg-brand-muted"
              }`}
            />
            <span
              className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${
                isDirty ? "text-amber-700" : "text-[#566475]"
              }`}
            >
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
                  className={SECONDARY_BUTTON}
                >
                  {isPreviewing ? <Spinner size={16} /> : <Eye size={16} />}
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit((data) => submitEdit(data, false))();
                  }}
                  disabled={isSubmitting}
                  // A draft's primary action is Publish (rendered next to this),
                  // so Save Changes steps back to the teal secondary weight.
                  className={
                    post?.status === "DRAFT" ? TEAL_BUTTON : PRIMARY_BUTTON
                  }
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
                    className={PRIMARY_BUTTON}
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
                  className={SECONDARY_BUTTON}
                >
                  {isSubmitting ? "Saving…" : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void requestPublish();
                  }}
                  disabled={isSubmitting}
                  className={PRIMARY_BUTTON}
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
