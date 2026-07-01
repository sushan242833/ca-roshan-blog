"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/config/site.config";
import { formatPostDate } from "@/lib/format";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import type { PostSummaryResponse } from "@/types/post";

interface PostSummaryCardProps {
  post: PostSummaryResponse;
}

export default function PostSummaryCard({ post }: PostSummaryCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = post.featuredImage && !imageError;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-t-lg">
        <PostImagePlaceholder className="absolute inset-0" />
        {showImage && (
          <Image
            src={post.featuredImage!.url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Category pill */}
        {post.category && (
          <span className="w-fit rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teal">
            {post.category.name}
          </span>
        )}

        {/* Title */}
        <h3 className="font-serif text-base font-bold text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="flex-1 text-sm text-gray-600 line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500">
          <span>{post.author?.name ?? SITE_NAME}</span>
          <span>{formatPostDate(post.publishedAt ?? post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
