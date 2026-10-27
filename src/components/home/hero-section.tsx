import Image from "next/image";
import Link from "next/link";
import { htmlToPlainText } from "@/lib/format";
import type { PostSummaryResponse } from "@/types/post";

export const HERO_IMAGE = "/hero/hero.webp";

interface HeroSectionProps {
  post: PostSummaryResponse | null;
  fallbackHeading: string;
  fallbackSubtext: string;
}

export default function HeroSection({
  post,
  fallbackHeading,
  fallbackSubtext,
}: HeroSectionProps) {
  const heading = post?.title ?? fallbackHeading;
  const subtext = post?.excerpt
    ? htmlToPlainText(post.excerpt)
    : post
      ? null
      : fallbackSubtext;

  return (
    <section className="relative isolate flex min-h-[480px] items-center overflow-hidden bg-brand-navy md:min-h-[600px]">
      {/* Decorative backdrop, so empty alt. It is the page's largest paint, so
          preload it rather than lazy-load it. */}
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover"
      />
      {/* Darkens the left side so the copy stays readable over the photo. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/80 via-black/35 to-black/10" />

      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="max-w-2xl text-white">
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-5xl">
            {heading}
          </h1>
          {subtext && (
            <p className="mt-6 line-clamp-3 text-base leading-relaxed text-white/90 md:text-lg">
              {subtext}
            </p>
          )}
          {post && (
            <Link
              href={`/blogs/${post.slug}`}
              className="mt-8 inline-block bg-white px-8 py-3 text-sm font-semibold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-mint"
            >
              Learn more
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
