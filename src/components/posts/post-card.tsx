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
  rootClassName: string;
  showImage: boolean;
  aspectClassName: string;
  imageSizes: string;
  imageClassName: string;
  bodyClassName: string;
  showCategoryOnImage: boolean;
  showCategoryPill: boolean;
  showReadingTime: boolean;
  titleClassName: string;
  excerptClassName: string;
  footer: "cta" | "author-date" | "none";
}

const CARD_ROOT_CLASSNAME =
  "group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md";

// Every image-bearing variant frames at 16:9. Cards sit in grids, so the ratio
// has to be uniform across a row — and matching the ratio the cover art is
// actually authored at means `object-cover` has nothing left to crop away.
const VARIANT_CONFIG: Record<PostCardVariant, VariantConfig> = {
  featured: {
    rootClassName: CARD_ROOT_CLASSNAME,
    showImage: true,
    aspectClassName: "aspect-video",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    imageClassName: "object-cover",
    bodyClassName: "gap-3 p-5",
    showCategoryOnImage: false,
    showCategoryPill: true,
    showReadingTime: true,
    titleClassName:
      "font-serif text-xl font-bold text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal",
    excerptClassName: "text-sm text-gray-600 line-clamp-3",
    footer: "cta",
  },
  recommended: {
    rootClassName: "group block cursor-pointer",
    showImage: true,
    aspectClassName: "aspect-video",
    imageSizes: "(max-width: 768px) 100vw, 33vw",
    imageClassName:
      "object-cover transition-transform duration-500 group-hover:scale-105",
    bodyClassName: "gap-0 p-0",
    showCategoryOnImage: false,
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
    aspectClassName: "aspect-video",
    imageSizes: "(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw",
    imageClassName: "object-cover",
    bodyClassName: "gap-2 p-4",
    showCategoryOnImage: true,
    showCategoryPill: false,
    showReadingTime: false,
    titleClassName:
      "font-serif text-base font-bold leading-snug text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal",
    excerptClassName: "text-sm leading-relaxed text-gray-600 line-clamp-2",
    footer: "author-date",
  },
  compact: {
    rootClassName:
      "group flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors hover:bg-gray-50",
    showImage: false,
    aspectClassName: "",
    imageSizes: "",
    imageClassName: "",
    bodyClassName: "gap-1",
    showCategoryOnImage: false,
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
  const excerptText = post.excerpt ? htmlToPlainText(post.excerpt) : "";
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
          {config.showCategoryOnImage && categoryList.length > 0 && (
            <span className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-brand-teal shadow-sm">
              <span className="truncate">{categoryList[0].name}</span>
              {categoryList.length > 1 && (
                <span className="text-brand-teal/70">
                  +{categoryList.length - 1}
                </span>
              )}
            </span>
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
          <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span>{post.author?.name ?? SITE_NAME}</span>
            <span>{formatPostDate(post.publishedAt ?? post.createdAt)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
