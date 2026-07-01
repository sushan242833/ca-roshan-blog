"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx={12} cy={12} r={10} />
              <polyline points="12 6 12 12 16 14" />
            </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1={5} y1={12} x2={19} y2={12} />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
