import Link from "next/link";
import FeaturedPostCard from "@/components/posts/featured-post-card";
import PostSummaryCard from "@/components/posts/post-summary-card";
import { apiRequest } from "@/lib/api";
import { ArrowRightIcon } from "@/components/icons";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

const HERO_HEADING = "Clear thinking on tax, finance, and policy";
const HERO_SUBTEXT =
  "Expert analysis and actionable insights designed for financial " +
  "professionals, business owners, and corporate leaders navigating " +
  "the evolving economic landscape in Nepal.";

export default async function HomePage() {
  let featuredPosts: PostSummaryResponse[] = [];
  let recentPosts: PostSummaryResponse[] = [];

  try {
    const [featuredData, recentData] = await Promise.all([
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        "/v1/posts/featured?limit=2",
        { next: { revalidate: 60 } },
      ),
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        "/v1/posts?limit=3",
        { next: { revalidate: 60 } },
      ),
    ]);
    featuredPosts = featuredData.items;
    recentPosts = recentData.items;
  } catch (err) {
    console.error("Failed to fetch home page posts:", err);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="font-serif text-4xl font-bold text-brand-navy md:text-5xl">
            {HERO_HEADING}
          </h1>
          <div className="mx-auto my-5 h-0.5 w-12 bg-brand-teal" />
          <p className="mx-auto max-w-xl text-center text-gray-600">
            {HERO_SUBTEXT}
          </p>
        </div>
      </section>

      {/* Featured Insights */}
      {featuredPosts.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch rounded-full bg-brand-teal" />
              <h2 className="font-serif text-2xl font-bold text-brand-navy">
                Featured Insights
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {featuredPosts.map((post, index) => (
                <FeaturedPostCard
                  key={post.id}
                  post={post}
                  priority={index === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Publications */}
      {recentPosts.length > 0 && (
        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="w-1 self-stretch rounded-full bg-brand-teal" />
              <h2 className="font-serif text-2xl font-bold text-brand-navy">
                Recent Publications
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {recentPosts.map((post) => (
                <PostSummaryCard key={post.id} post={post} />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-6 py-2.5 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-200"
              >
                View all posts
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
