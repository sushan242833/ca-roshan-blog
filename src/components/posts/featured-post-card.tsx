"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import { ClockIcon, ArrowRightIcon } from "@/components/icons";
import type { PostSummaryResponse } from "@/types/post";

interface FeaturedPostCardProps {
  post: PostSummaryResponse;
  priority?: boolean;
}

export default function FeaturedPostCard({
  post,
  priority = false,
}: FeaturedPostCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = post.featuredImage && !imageError;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
        <PostImagePlaceholder className="absolute inset-0" />
        {showImage && (
          <Image
            src={post.featuredImage!.url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {post.category && (
            <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teal">
              {post.category.name}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon size={12} />
            {post.readingTime} min read
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl font-bold text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="flex-1 text-sm text-gray-600 line-clamp-3">
            {post.excerpt}
          </p>
        )}

        {/* CTA */}
        <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-teal">
          Read Article
          <ArrowRightIcon size={14} />
        </span>
      </div>
    </Link>
  );
}
