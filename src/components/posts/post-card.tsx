"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/config/site.config";
import { formatPostDate, htmlToPlainText } from "@/lib/format";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { ClockIcon, ArrowRightIcon } from "@/components/icons";
import type { PostSummaryResponse } from "@/types/post";

export type PostCardVariant =
  | "featured"
  | "recommended"
  | "summary"
  | "compact";

interface VariantConfig {
  // Root <Link> class — lets the compact variant read as a lightweight result
  // row rather than a shadowed card.
  rootClassName: string;
  // The compact variant drops the image entirely to stay light in the overlay.
  showImage: boolean;
  aspectClassName: string;
  imageSizes: string;
  imageClassName: string;
  bodyClassName: string;
  showCategoryPill: boolean;
  showReadingTime: boolean;
  titleClassName: string;
  excerptClassName: string;
  footer: "cta" | "author-date" | "none";
}

const CARD_ROOT_CLASSNAME =
  "group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md";

const VARIANT_CONFIG: Record<PostCardVariant, VariantConfig> = {
  featured: {
    rootClassName: CARD_ROOT_CLASSNAME,
    showImage: true,
    aspectClassName: "aspect-video",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    imageClassName: "object-cover",
    bodyClassName: "gap-3 p-5",
    showCategoryPill: true,
    showReadingTime: true,
    titleClassName:
      "font-serif text-xl font-bold text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal",
    excerptClassName: "flex-1 text-sm text-gray-600 line-clamp-3",
    footer: "cta",
  },
  recommended: {
    rootClassName: "group block cursor-pointer",
    showImage: true,
    aspectClassName: "h-48",
    imageSizes: "(max-width: 768px) 100vw, 33vw",
    imageClassName:
      "object-cover transition-transform duration-500 group-hover:scale-105",
    bodyClassName: "gap-0 p-0",
    showCategoryPill: false,
    showReadingTime: false,
    titleClassName:
      "mt-2 font-serif text-[24px] font-semibold leading-[1.35] tracking-normal text-[#121c2a] line-clamp-2 transition-colors group-hover:text-[#005243]",
    excerptClassName: "mt-2 text-sm leading-[1.5] text-[#3f4945] line-clamp-2",
    footer: "none",
  },
  summary: {
    rootClassName: CARD_ROOT_CLASSNAME,
    showImage: true,
    aspectClassName: "aspect-4/3",
    imageSizes: "(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw",
    imageClassName: "object-cover",
    bodyClassName: "gap-2 p-4",
    showCategoryPill: true,
    showReadingTime: false,
    titleClassName:
      "font-serif text-base font-bold text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal",
    excerptClassName: "flex-1 text-sm text-gray-600 line-clamp-2",
    footer: "author-date",
  },
  // Text-only result row for the header search overlay: category pill, title,
  // short excerpt — no image, no footer.
  compact: {
    rootClassName:
      "group flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors hover:bg-gray-50",
    showImage: false,
    aspectClassName: "",
    imageSizes: "",
    imageClassName: "",
    bodyClassName: "gap-1",
    showCategoryPill: true,
    showReadingTime: false,
    titleClassName:
      "font-serif text-sm font-bold text-brand-navy line-clamp-1 transition-colors group-hover:text-brand-teal",
    excerptClassName: "text-xs text-gray-500 line-clamp-2",
    footer: "none",
  },
};

interface PostCardProps {
  post: PostSummaryResponse;
  variant: PostCardVariant;
  priority?: boolean;
  /** Fired on navigation — used by the search overlay to close itself. */
  onClick?: () => void;
}

export default function PostCard({
  post,
  variant,
  priority = false,
  onClick,
}: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = post.featuredImage && !imageError;
  const config = VARIANT_CONFIG[variant];
  // Excerpts may be auto-generated from HTML content — render as plain text,
  // and drop it entirely if nothing but markup remains (e.g. image-only lead).
  const excerptText = post.excerpt ? htmlToPlainText(post.excerpt) : "";
  // A post can belong to one or more categories. Prefer the full set; fall
  // back to the legacy single category for posts saved before multi-category.
  const categoryList =
    post.categories && post.categories.length > 0
      ? post.categories
      : post.category
        ? [post.category]
        : [];

  return (
    <Link
      href={`/blogs/${post.slug}`}
      onClick={onClick}
      className={config.rootClassName}
    >
      {/* Image */}
      {config.showImage && (
        <div
          className={
            variant === "recommended"
              ? `relative mb-4 w-full overflow-hidden rounded-lg bg-[#e6eeff] ${config.aspectClassName}`
              : `relative w-full overflow-hidden rounded-t-lg ${config.aspectClassName}`
          }
        >
          <PostImagePlaceholder className="absolute inset-0" />
          {showImage && (
            <Image
              src={post.featuredImage!.url}
              alt={post.title}
              fill
              sizes={config.imageSizes}
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              className={config.imageClassName}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      )}

      {/* Body */}
      <div className={`flex flex-1 flex-col ${config.bodyClassName}`}>
        {variant === "recommended" && categoryList.length > 0 && (
          <span className="text-xs font-bold uppercase leading-none tracking-normal text-[#005243]">
            {categoryList[0].name}
          </span>
        )}

        {/* Meta row */}
        {((config.showCategoryPill && categoryList.length > 0) ||
          config.showReadingTime) && (
          <div className="flex flex-wrap items-center gap-3">
            {config.showCategoryPill &&
              categoryList.map((category) => (
                <span
                  key={category.id}
                  className="w-fit rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teal"
                >
                  {category.name}
                </span>
              ))}
            {config.showReadingTime && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <ClockIcon size={12} />
                {post.readingTime} min read
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className={config.titleClassName}>{post.title}</h3>

        {/* Excerpt */}
        {excerptText && (
          <p className={config.excerptClassName}>{excerptText}</p>
        )}

        {/* Footer */}
        {config.footer === "cta" && (
          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-teal">
            Read Article
            <ArrowRightIcon size={14} />
          </span>
        )}
        {config.footer === "author-date" && (
          <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>{post.author?.name ?? SITE_NAME}</span>
            <span>{formatPostDate(post.publishedAt ?? post.createdAt)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
