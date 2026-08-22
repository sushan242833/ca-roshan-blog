import type { Metadata } from "next";
import Link from "next/link";
import PostCard from "@/components/posts/post-card";
import SectionHeading from "@/components/ui/section-heading";
import { apiRequest } from "@/lib/api";
import { CONTENT_REVALIDATE_SECONDS } from "@/lib/constants";
import { ArrowRightIcon } from "@/components/icons";
import WarmBackend from "@/components/warm-backend";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

export const metadata: Metadata = {
  title: "Home | CA Roshan",
  description:
    "Expert analysis and actionable insights designed for financial professionals, business owners, and corporate leaders navigating the evolving economic landscape in Nepal.",
  alternates: { canonical: "/" },
};

const HERO_HEADING = "Clear thinking on tax, finance, and policy";
const HERO_SUBTEXT =
  "Expert analysis and actionable insights designed for financial " +
  "professionals, business owners, and corporate leaders navigating " +
  "the evolving economic landscape in Nepal.";

export default async function HomePage() {
  let featuredPosts: PostSummaryResponse[] = [];
  let recentPosts: PostSummaryResponse[] = [];

  let loadFailed = false;

  try {
    const [featuredData, recentData] = await Promise.all([
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        "/v1/posts/featured?limit=2",
        { next: { revalidate: CONTENT_REVALIDATE_SECONDS } },
      ),
      apiRequest<PaginatedResponse<PostSummaryResponse>>("/v1/posts?limit=3", {
        next: { revalidate: CONTENT_REVALIDATE_SECONDS },
      }),
    ]);
    featuredPosts = featuredData.items;
    recentPosts = recentData.items;
  } catch (err) {
    console.error("Failed to fetch home page posts:", err);
    loadFailed = true;
  }

  return (
    <>
      {/* Wakes the Render free-tier backend in parallel with rendering. Renders
          nothing and fails silently. */}
      <WarmBackend />

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

      {loadFailed && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              Articles could not be loaded
            </h2>
            <p className="mt-3 text-gray-600">
              We could not reach the server just now, so the latest writing is
              not showing. This is a problem on our side and is usually
              temporary — please try again shortly.
            </p>
            <Link
              href="/blogs"
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white"
            >
              Try the articles page
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* Genuinely empty: the API answered, there is just nothing published. */}
      {!loadFailed &&
        featuredPosts.length === 0 &&
        recentPosts.length === 0 && (
          <section className="bg-gray-50 py-12 md:py-16">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <h2 className="font-serif text-2xl font-bold text-brand-navy">
                No articles published yet
              </h2>
              <p className="mt-3 text-gray-600">
                New writing on tax, finance, and policy will appear here.
              </p>
            </div>
          </section>
        )}

      {/* Featured Insights */}
      {featuredPosts.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading>Featured Insights</SectionHeading>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {featuredPosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="featured"
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
            <SectionHeading>Recent Publications</SectionHeading>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {recentPosts.map((post) => (
                <PostCard key={post.id} post={post} variant="summary" />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link
                href="/blogs"
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
