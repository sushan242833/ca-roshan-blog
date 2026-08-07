import Image from "next/image";
import Link from "next/link";
import ChapterContents from "@/components/blogs/chapter-contents";
import { ArrowRightIcon } from "@/components/icons";
import { optimizeCloudinaryUrl } from "@/lib/article-images";
import { SITE_NAME } from "@/config/site.config";
import type { ChapterIndexResponse } from "@/types/post";

interface ChapterHubProps {
  index: ChapterIndexResponse;
  /**
   * Where this hub's chapter links point — `/blogs/<slug>` for a published post,
   * `/blogs/preview/<token>` for a draft preview. Shared so a preview renders
   * the identical hub the reader will see, just against a different route.
   */
  basePath: string;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

// The landing page for a post large enough to be split into chapters: title,
// byline, a "start reading" entry point and the numbered contents rail. Each
// chapter is its own page, so nothing here carries the article body.
export default function ChapterHub({ index, basePath }: ChapterHubProps) {
  // A post can belong to one or more categories. Prefer the full set; fall
  // back to the legacy single category for posts saved before multi-category.
  const categoryList =
    index.categories && index.categories.length > 0
      ? index.categories
      : index.category
        ? [index.category]
        : [];
  const firstChapter = index.chapters[0];

  return (
    <article>
      <header className="px-6 pb-8 pt-16 text-center md:px-0">
        <div className="mx-auto max-w-[800px]">
          {categoryList.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              {categoryList.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="inline-block rounded-full bg-[#d3e1f6] px-4 py-1 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-[#566475] transition-colors hover:bg-[#bac8dc]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          <h1 className="mx-auto mb-8 max-w-[700px] font-serif text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[#121c2a] md:text-[48px]">
            {index.title}
          </h1>

          {/* Short rule above the byline, in place of the full-width border. */}
          <div className="mx-auto mb-8 h-px w-24 bg-brand-muted" />

          <div className="mb-12 flex flex-col items-center justify-center gap-4 text-[14px] font-medium text-[#44474c] md:flex-row md:gap-8">
            <span className="font-semibold text-[#121c2a]">
              {index.author?.name ?? SITE_NAME}
            </span>
            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-brand-muted md:inline-block"
            />
            <span>
              Published: {formatDate(index.publishedAt ?? index.createdAt)}
            </span>
            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-brand-muted md:inline-block"
            />
            <span>{index.totalChapters} chapters</span>
          </div>

          {firstChapter && (
            <div className="mb-16">
              <Link
                href={`${basePath}/${firstChapter.id}`}
                className="mx-auto inline-flex items-center justify-center gap-2 rounded bg-[#121c2a] px-8 py-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Start reading
                <ArrowRightIcon size={18} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {index.featuredImage && index.showFeaturedImage && (
        <section className="mb-20 px-6 md:px-0">
          <div className="mx-auto max-w-[1000px]">
            <figure className="group relative aspect-[21/9] overflow-hidden rounded-xl border border-brand-muted bg-[#d5e4f8] shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
              <Image
                src={optimizeCloudinaryUrl(index.featuredImage.url)}
                alt={index.title}
                width={1200}
                height={675}
                sizes="(max-width: 768px) 100vw, 1000px"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                loading="eager"
                fetchPriority="high"
              />
            </figure>
          </div>
        </section>
      )}

      <div className="pb-20">
        <ChapterContents basePath={basePath} chapters={index.chapters} />
      </div>
    </article>
  );
}
