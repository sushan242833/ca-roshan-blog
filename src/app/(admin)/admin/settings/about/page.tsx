"use client";

import { useState } from "react";
import Image from "next/image";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { authenticatedApiRequest, ApiRequestError } from "@/lib/api";
import { API_BASE_URL } from "@/config/site.config";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
  MAX_META_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
} from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidatePublicContent } from "@/lib/revalidate";
import type { ExpertiseItem } from "@/types/about";

// Mirrors the backend's validateUpdateProfile limits.
const MAX_TITLE_LENGTH = 150;
const MAX_LOCATION_LENGTH = 200;
const MAX_YEARS_OF_EXPERIENCE_LENGTH = 100;
const MAX_QUALIFICATION_LENGTH = 300;
// seoTitle/seoDescription share the same 60/160 convention as post meta tags.
const MAX_SEO_TITLE_LENGTH = MAX_META_TITLE_LENGTH;
const MAX_SEO_DESCRIPTION_LENGTH = MAX_META_DESCRIPTION_LENGTH;

interface ProfileFormValues {
  title: string;
  bio: string;
  bioParagraph2: string;
  avatarUrl: string;
  location: string;
  yearsOfExperience: string;
  qualification: string;
  professionalQuote: string;
  expertise: ExpertiseItem[];
  closingMessage: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
}

const EMPTY_FORM_VALUES: ProfileFormValues = {
  title: "",
  bio: "",
  bioParagraph2: "",
  avatarUrl: "",
  location: "",
  yearsOfExperience: "",
  qualification: "",
  professionalQuote: "",
  expertise: [],
  closingMessage: "",
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
};

async function uploadImage(file: File, token: string | null): Promise<string> {
  // Raw fetch instead of apiRequest — apiRequest always forces a JSON
  // Content-Type header, which breaks multipart/form-data uploads.
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/v1/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  let body: { success: boolean; message?: string; data?: { url: string } };
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError("Invalid response from server.", res.status);
  }

  if (!res.ok || !body.success || !body.data) {
    throw new ApiRequestError(body.message ?? "Failed to upload image.", res.status);
  }

  return body.data.url;
}

export default function AdminAboutSettingsPage() {
  // AdminGuard only renders this page once `admin` is populated.
  const { admin, accessToken } = useAuth();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingOgImage, setIsUploadingOgImage] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: admin
      ? {
          title: admin.title ?? "",
          bio: admin.bio ?? "",
          bioParagraph2: admin.bioParagraph2 ?? "",
          avatarUrl: admin.avatarUrl ?? "",
          location: admin.location ?? "",
          yearsOfExperience: admin.yearsOfExperience ?? "",
          qualification: admin.qualification ?? "",
          professionalQuote: admin.professionalQuote ?? "",
          expertise: admin.expertise ?? [],
          closingMessage: admin.closingMessage ?? "",
          seoTitle: admin.seoTitle ?? "",
          seoDescription: admin.seoDescription ?? "",
          ogImageUrl: admin.ogImageUrl ?? "",
        }
      : EMPTY_FORM_VALUES,
  });

  const {
    fields: expertiseFields,
    append: appendExpertise,
    remove: removeExpertise,
  } = useFieldArray({ control, name: "expertise" });

  const avatarUrl = watch("avatarUrl");
  const ogImageUrl = watch("ogImageUrl");
  const titleValue = watch("title");
  const locationValue = watch("location");
  const yearsOfExperienceValue = watch("yearsOfExperience");
  const qualificationValue = watch("qualification");
  const seoTitleValue = watch("seoTitle");
  const seoDescriptionValue = watch("seoDescription");

  if (!admin) return null;

  async function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "avatarUrl" | "ogImageUrl",
    setUploading: (value: boolean) => void,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file, accessToken);
      setValue(field, url, { shouldDirty: true });
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : "Failed to upload image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSave(data: ProfileFormValues) {
    const cleanedExpertise = data.expertise.filter(
      (item) => item.title.trim() || item.description.trim(),
    );

    try {
      await authenticatedApiRequest("/v1/auth/profile", accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          title: data.title || null,
          bio: data.bio || null,
          bioParagraph2: data.bioParagraph2 || null,
          avatarUrl: data.avatarUrl || null,
          location: data.location || null,
          yearsOfExperience: data.yearsOfExperience || null,
          qualification: data.qualification || null,
          professionalQuote: data.professionalQuote || null,
          expertise:
            cleanedExpertise.length > 0 ? JSON.stringify(cleanedExpertise) : null,
          closingMessage: data.closingMessage || null,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          ogImageUrl: data.ogImageUrl || null,
        }),
      });
      await revalidatePublicContent("about", accessToken);
      toast.success("Profile updated successfully");
      reset({ ...data, expertise: cleanedExpertise });
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to update profile.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-28">
      <p className="text-sm text-gray-400">
        <span>Settings</span> <span className="mx-1">/</span>{" "}
        <span className="text-brand-navy">About Page</span>
      </p>
      <h1 className="mt-1 font-serif text-2xl font-bold text-brand-navy">
        About Page Settings
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Configure your personal brand identity and professional narrative.
      </p>

      <form onSubmit={handleSubmit(onSave)} className="mt-6 space-y-6">
        {/* Section 1 — Profile Information */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            Profile Information
          </h2>

          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-200">
              {avatarUrl && (
                <Image
                  src={avatarUrl}
                  alt={admin.name || "Profile photo"}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <label className="inline-block cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-100">
                {isUploadingAvatar ? "Uploading…" : "Replace Image"}
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  onChange={(e) =>
                    handleImageChange(e, "avatarUrl", setIsUploadingAvatar)
                  }
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Accepted: PNG, JPG, WEBP (max {MAX_IMAGE_SIZE_MB}MB)
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                value={admin.name}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Name can be updated from your account settings
              </p>
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Professional Title</span>
                <span className="text-xs font-normal text-gray-400">
                  {titleValue.length}/{MAX_TITLE_LENGTH}
                </span>
              </label>
              <input
                {...register("title")}
                maxLength={MAX_TITLE_LENGTH}
                placeholder="e.g. Chartered Accountant"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Location</span>
                <span className="text-xs font-normal text-gray-400">
                  {locationValue.length}/{MAX_LOCATION_LENGTH}
                </span>
              </label>
              <input
                {...register("location")}
                maxLength={MAX_LOCATION_LENGTH}
                placeholder="e.g. Kathmandu, Nepal"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Years of Experience</span>
                <span className="text-xs font-normal text-gray-400">
                  {yearsOfExperienceValue.length}/{MAX_YEARS_OF_EXPERIENCE_LENGTH}
                </span>
              </label>
              <input
                {...register("yearsOfExperience")}
                maxLength={MAX_YEARS_OF_EXPERIENCE_LENGTH}
                placeholder="e.g. 10+ Years"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Qualification</span>
              <span className="text-xs font-normal text-gray-400">
                {qualificationValue.length}/{MAX_QUALIFICATION_LENGTH}
              </span>
            </label>
            <input
              {...register("qualification")}
              maxLength={MAX_QUALIFICATION_LENGTH}
              placeholder="e.g. Fellow Chartered Accountant (FCA)"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
        </section>

        {/* Section 2 — Professional Background */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            Professional Background
          </h2>
          <div className="mt-4">
            <label
              htmlFor="bio"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Paragraph 1: The Origin
            </label>
            <textarea
              id="bio"
              rows={4}
              {...register("bio")}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
          <div className="mt-4">
            <label
              htmlFor="bioParagraph2"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Paragraph 2: Today
            </label>
            <textarea
              id="bioParagraph2"
              rows={4}
              {...register("bioParagraph2")}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
            <p className="mt-1 text-xs text-gray-400">
              Your professional background and experience
            </p>
          </div>
        </section>

        {/* Section 3 — Professional Quote */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            Professional Quote
          </h2>
          <div className="mt-4">
            <textarea
              rows={3}
              {...register("professionalQuote")}
              placeholder="A short, quotable statement of your professional philosophy"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
            <p className="mt-1 text-xs text-gray-400">
              Shown as the blockquote on the public About page
            </p>
          </div>
        </section>

        {/* Section 4 — Areas of Expertise */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-brand-navy">
              Areas of Expertise
            </h2>
            <span className="text-xs text-gray-400">
              {expertiseFields.length} item{expertiseFields.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {expertiseFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-4"
              >
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Expertise Title
                    </label>
                    <input
                      {...register(`expertise.${index}.title` as const)}
                      placeholder="e.g. Strategic Tax Planning"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Description
                    </label>
                    <textarea
                      {...register(`expertise.${index}.description` as const)}
                      rows={2}
                      placeholder="Briefly describe this area of expertise"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExpertise(index)}
                  aria-label="Remove expertise item"
                  className="mt-6 shrink-0 text-gray-400 transition-colors hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => appendExpertise({ title: "", description: "" })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 py-2 text-sm text-gray-500 transition-colors hover:border-brand-teal hover:text-brand-teal"
          >
            <Plus size={16} />
            Add Expertise Item
          </button>
        </section>

        {/* Section 5 — Closing Message */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            Closing Message
          </h2>
          <div className="mt-4">
            <textarea
              rows={3}
              {...register("closingMessage")}
              placeholder="A closing statement of commitment shown at the end of the About page"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
        </section>

        {/* Section 6 — SEO & Social Meta */}
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="font-serif text-lg font-bold text-brand-navy">
            SEO &amp; Social Meta
          </h2>

          <div className="mt-4">
            <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>SEO Title</span>
              <span className="text-xs font-normal text-gray-400">
                {seoTitleValue.length}/{MAX_SEO_TITLE_LENGTH}
              </span>
            </label>
            <input
              {...register("seoTitle")}
              maxLength={MAX_SEO_TITLE_LENGTH}
              placeholder="Appears in Google search results"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>SEO Description</span>
              <span className="text-xs font-normal text-gray-400">
                {seoDescriptionValue.length}/{MAX_SEO_DESCRIPTION_LENGTH}
              </span>
            </label>
            <textarea
              rows={2}
              {...register("seoDescription")}
              maxLength={MAX_SEO_DESCRIPTION_LENGTH}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              OG Image (Social Preview)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-gray-200">
                {ogImageUrl && (
                  <Image
                    src={ogImageUrl}
                    alt="Social preview"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </div>
              <label className="inline-block cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-100">
                {isUploadingOgImage ? "Uploading…" : "Upload Image"}
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  onChange={(e) =>
                    handleImageChange(e, "ogImageUrl", setIsUploadingOgImage)
                  }
                  disabled={isUploadingOgImage}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Recommended size: 1200×630px (PNG or JPG)
            </p>
          </div>
        </section>

        {/* Bottom action bar */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  isDirty ? "bg-amber-500" : "bg-gray-300"
                }`}
              />
              <span className={isDirty ? "text-amber-600" : "text-gray-400"}>
                {isDirty ? "Unsaved changes detected" : "No unsaved changes"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                disabled={!isDirty || isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <a
                href="/about"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50"
              >
                Preview Changes
              </a>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-brand-teal-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
