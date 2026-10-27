import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeroSection, { HERO_IMAGE } from "@/components/home/hero-section";
import type { PostSummaryResponse } from "@/types/post";

// next/image and next/link pull in the Next runtime; stub them to plain DOM so
// HeroSection renders in jsdom.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const FALLBACK_HEADING = "Fallback heading";
const FALLBACK_SUBTEXT = "Fallback subtext";

const post = {
  id: "1",
  title: "Hero post title",
  slug: "hero-post",
  excerpt: "<p>Hero post excerpt</p>",
} as PostSummaryResponse;

function renderHero(heroPost: PostSummaryResponse | null = null) {
  return render(
    <HeroSection
      post={heroPost}
      fallbackHeading={FALLBACK_HEADING}
      fallbackSubtext={FALLBACK_SUBTEXT}
    />,
  );
}

describe("HeroSection", () => {
  it("renders the hero photo as a decorative image", () => {
    const { container } = renderHero();
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", HERO_IMAGE);
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders no video", () => {
    const { container } = renderHero();
    expect(container.querySelector("video")).toBeNull();
  });

  it("renders the fallback heading and subtext when there is no post", () => {
    renderHero();
    expect(
      screen.getByRole("heading", { name: FALLBACK_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByText(FALLBACK_SUBTEXT)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Learn more" })).toBeNull();
  });

  it("renders the post title, plain-text excerpt and Learn more link", () => {
    renderHero(post);
    expect(
      screen.getByRole("heading", { name: post.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hero post excerpt")).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK_HEADING)).toBeNull();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      `/blogs/${post.slug}`,
    );
  });
});
