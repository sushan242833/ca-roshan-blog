"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/config/site.config";
import { formatPostDate } from "@/lib/format";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { ClockIcon, ArrowRightIcon } from "@/components/icons";
import type { PostSummaryResponse } from "@/types/post";

export type PostCardVariant = "featured" | "recommended" | "summary";

interface VariantConfig {
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

const VARIANT_CONFIG: Record<PostCardVariant, VariantConfig> = {
  featured: {
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
    aspectClassName: "aspect-video",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    imageClassName:
      "object-cover transition-transform duration-300 group-hover:scale-105",
    bodyClassName: "gap-2 p-5",
    showCategoryPill: false,
    showReadingTime: false,
    titleClassName:
      "font-serif text-lg font-bold leading-snug text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal",
    excerptClassName: "text-sm text-gray-500 line-clamp-2",
    footer: "none",
  },
  summary: {
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
};

interface PostCardProps {
  post: PostSummaryResponse;
  variant: PostCardVariant;
  priority?: boolean;
}

export default function PostCard({
  post,
  variant,
  priority = false,
}: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = post.featuredImage && !imageError;
  const config = VARIANT_CONFIG[variant];

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div
        className={`relative w-full overflow-hidden rounded-t-lg ${config.aspectClassName}`}
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

      {/* Body */}
      <div className={`flex flex-1 flex-col ${config.bodyClassName}`}>
        {/* Meta row */}
        {((config.showCategoryPill && post.category) ||
          config.showReadingTime) && (
          <div className="flex flex-wrap items-center gap-3">
            {config.showCategoryPill && post.category && (
              <span className="w-fit rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teal">
                {post.category.name}
              </span>
            )}
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
        {post.excerpt && (
          <p className={config.excerptClassName}>{post.excerpt}</p>
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
