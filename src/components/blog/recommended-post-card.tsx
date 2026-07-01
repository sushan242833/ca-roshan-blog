"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PostImagePlaceholder from "@/components/posts/post-image-placeholder";
import type { PostSummaryResponse } from "@/types/post";

interface RecommendedPostCardProps {
  post: PostSummaryResponse;
}

export default function RecommendedPostCard({ post }: RecommendedPostCardProps) {
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-serif text-lg font-bold leading-snug text-brand-navy line-clamp-2 transition-colors group-hover:text-brand-teal">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
        )}
      </div>
    </Link>
  );
}
