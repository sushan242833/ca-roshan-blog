import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeaturedCarousel from "@/components/home/featured-carousel";
import {
  FEATURED_CAROUSEL_INTERVAL_MS as INTERVAL,
  FEATURED_CAROUSEL_TRANSITION_MS as TRANSITION,
} from "@/lib/constants";
import type { PostSummaryResponse } from "@/types/post";

// next/image and next/link pull in the Next runtime; stub them to plain DOM.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    priority,
  }: {
    src: string;
    alt: string;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-priority={priority ? "true" : "false"} />
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

function makePost(n: number): PostSummaryResponse {
  return {
    id: `post-${n}`,
    title: `Post ${n}`,
    slug: `post-${n}`,
    excerpt: null,
    status: "PUBLISHED",
    featured: true,
    featuredPosition: n,
    metaTitle: null,
    metaDescription: null,
    pdfUrl: null,
    pdfLabel: null,
    featuredImage: {
      id: `img-${n}`,
      url: `https://example.test/${n}.webp`,
      fileName: `${n}.webp`,
    },
    showFeaturedImage: true,
    showInHero: false,
    category: null,
    categories: [],
    tags: [],
    author: null,
    readingTime: 3,
    viewCount: 0,
    publishedAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

const posts = (count: number) =>
  Array.from({ length: count }, (_, index) => makePost(index + 1));

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function activeDot(): string | null {
  const active = screen
    .getAllByRole("button", { name: /^Show slide/ })
    .find((dot) => dot.getAttribute("aria-current") === "true");
  return active?.getAttribute("aria-label") ?? null;
}

function visibleSlideLabels(): string[] {
  return screen
    .getAllByRole("group", { hidden: true })
    .filter((slide) => !slide.hasAttribute("inert"))
    .map((slide) => slide.getAttribute("aria-label") ?? "");
}

function track(): HTMLElement {
  return screen.getByTestId("featured-carousel-track");
}

// Steps time in small slices, each in its own act(): the next autoplay timer is
// scheduled by an effect after each move, so one long jump would fire only the
// first of several due timers.
function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - elapsed));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  mockReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeaturedCarousel", () => {
  it("advances one card per interval", () => {
    render(<FeaturedCarousel posts={posts(5)} />);

    expect(activeDot()).toBe("Show slide 1 of 5");
    expect(visibleSlideLabels()).toEqual(["1 of 5", "2 of 5"]);

    advance(INTERVAL - 1);
    expect(activeDot()).toBe("Show slide 1 of 5");

    advance(1);
    expect(activeDot()).toBe("Show slide 2 of 5");
    expect(visibleSlideLabels()).toEqual(["2 of 5", "3 of 5"]);
    expect(track().style.transition).toBe(
      `transform ${TRANSITION}ms cubic-bezier(0.45, 0, 0.2, 1)`,
    );
  });

  it("loops forward from the last card to the first without sliding back", () => {
    render(<FeaturedCarousel posts={posts(4)} />);

    advance(INTERVAL * 3);
    expect(activeDot()).toBe("Show slide 4 of 4");

    // The fourth move slides forward onto the clone of the first card…
    advance(INTERVAL);
    expect(activeDot()).toBe("Show slide 1 of 4");
    expect(track().style.transform).toBe("translate3d(-200%, 0, 0)");
    expect(visibleSlideLabels()).toEqual(["1 of 4", "2 of 4"]);

    // …then, once that slide has finished, snaps silently to the original.
    fireEvent.transitionEnd(track(), { propertyName: "transform" });
    expect(track().style.transform).toBe("translate3d(-0%, 0, 0)");
    expect(track().style.transition).toBe("none");
    expect(visibleSlideLabels()).toEqual(["1 of 4", "2 of 4"]);

    // And keeps rotating on the normal rhythm from there.
    advance(INTERVAL);
    expect(activeDot()).toBe("Show slide 2 of 4");
  });

  it("still snaps back from the clones when transitionend never fires", () => {
    render(<FeaturedCarousel posts={posts(4)} />);

    advance(INTERVAL * 4);
    expect(track().style.transform).toBe("translate3d(-200%, 0, 0)");

    // A hidden tab skips the event; the fallback timer does the snap.
    advance(TRANSITION + 200);
    expect(track().style.transform).toBe("translate3d(-0%, 0, 0)");
  });

  it("pauses while hovered and resumes on leave", () => {
    render(<FeaturedCarousel posts={posts(5)} />);
    const carousel = screen.getByRole("region", { name: "Featured Insights" });

    fireEvent.pointerEnter(carousel);
    advance(INTERVAL * 3);
    expect(activeDot()).toBe("Show slide 1 of 5");

    fireEvent.pointerLeave(carousel);
    advance(INTERVAL);
    expect(activeDot()).toBe("Show slide 2 of 5");
  });

  it("pauses while an element inside has keyboard focus and resumes on blur", () => {
    render(<FeaturedCarousel posts={posts(5)} />);
    const nextButton = screen.getByRole("button", { name: "Next slide" });

    act(() => nextButton.focus());
    advance(INTERVAL * 3);
    expect(activeDot()).toBe("Show slide 1 of 5");

    act(() => nextButton.blur());
    advance(INTERVAL);
    expect(activeDot()).toBe("Show slide 2 of 5");
  });

  it("pauses while the tab is hidden", () => {
    render(<FeaturedCarousel posts={posts(5)} />);

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(INTERVAL * 2);
    expect(activeDot()).toBe("Show slide 1 of 5");
  });

  it("moves with the arrows and dots and restarts the timer", () => {
    render(<FeaturedCarousel posts={posts(5)} />);

    advance(INTERVAL - 300);
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(activeDot()).toBe("Show slide 2 of 5");

    // A full interval from the click, not the 300 ms left before it.
    advance(INTERVAL - 1);
    expect(activeDot()).toBe("Show slide 2 of 5");
    advance(1);
    expect(activeDot()).toBe("Show slide 3 of 5");

    fireEvent.click(screen.getByRole("button", { name: "Show slide 5 of 5" }));
    expect(activeDot()).toBe("Show slide 5 of 5");

    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(activeDot()).toBe("Show slide 4 of 5");
  });

  it("goes back from the first card to the last", () => {
    render(<FeaturedCarousel posts={posts(5)} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(activeDot()).toBe("Show slide 5 of 5");
    expect(visibleSlideLabels()).toEqual(["5 of 5", "1 of 5"]);
  });

  it("does not rotate or animate when reduced motion is preferred", () => {
    mockReducedMotion(true);
    render(<FeaturedCarousel posts={posts(5)} />);

    advance(INTERVAL * 3);
    expect(activeDot()).toBe("Show slide 1 of 5");

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(activeDot()).toBe("Show slide 2 of 5");
    expect(track().style.transition).toBe("none");

    fireEvent.click(screen.getByRole("button", { name: "Show slide 1 of 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(activeDot()).toBe("Show slide 5 of 5");
  });

  it("renders a static row with no controls for two or fewer posts", () => {
    render(<FeaturedCarousel posts={posts(2)} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Featured Insights" }),
    ).not.toBeInTheDocument();

    advance(INTERVAL * 2);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("exposes carousel and slide semantics", () => {
    render(<FeaturedCarousel posts={posts(5)} />);

    const carousel = screen.getByRole("region", { name: "Featured Insights" });
    expect(carousel.tagName).toBe("SECTION");
    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");

    const slides = screen.getAllByRole("group", { hidden: true });
    // Five posts plus two clones that make the loop seamless.
    expect(slides).toHaveLength(7);
    slides.forEach((slide) =>
      expect(slide).toHaveAttribute("aria-roledescription", "slide"),
    );
    expect(slides.slice(0, 5).map((s) => s.getAttribute("aria-label"))).toEqual(
      ["1 of 5", "2 of 5", "3 of 5", "4 of 5", "5 of 5"],
    );

    // Off-screen slides are inert and hidden from assistive technology.
    expect(slides[0]).not.toHaveAttribute("inert");
    expect(slides[3]).toHaveAttribute("inert");
    expect(slides[3]).toHaveAttribute("aria-hidden", "true");

    // Silent while it moves on its own, announced once it stops.
    expect(track()).toHaveAttribute("aria-live", "off");
    fireEvent.pointerEnter(carousel);
    expect(track()).toHaveAttribute("aria-live", "polite");

    // No pause button: hover and keyboard focus are what stop it.
    expect(
      screen.queryByRole("button", { name: /pause/i }),
    ).not.toBeInTheDocument();

    // Only the first card's image is loaded with priority.
    const priorities = Array.from(
      document.querySelectorAll("img[data-priority]"),
    ).map((img) => img.getAttribute("data-priority"));
    expect(priorities.filter((p) => p === "true")).toHaveLength(1);
    expect(priorities[0]).toBe("true");
  });
});
