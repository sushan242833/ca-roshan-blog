import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArticleView from "@/components/blogs/article-view";
import { DEFAULT_PDF_LABEL } from "@/lib/constants";
import type { PostDetailResponse } from "@/types/post";

// next/image and next/link pull in the Next runtime; stub them to plain DOM so
// ArticleView renders in jsdom.
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
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

function makePost(overrides: Partial<PostDetailResponse>): PostDetailResponse {
  return {
    id: "post-1",
    title: "A Post",
    slug: "a-post",
    excerpt: "Summary",
    status: "PUBLISHED",
    featured: false,
    metaTitle: null,
    metaDescription: null,
    featuredImage: null,
    showFeaturedImage: true,
    category: null,
    categories: [],
    tags: [],
    author: null,
    readingTime: 3,
    viewCount: 0,
    publishedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    content: "<p>Body.</p>",
    pdfUrl: null,
    pdfLabel: null,
    ...overrides,
  };
}

describe("ArticleView PDF link", () => {
  it("renders a legacy pdfUrl as a compact chip at the end", () => {
    const post = makePost({
      content: "<p>Just some body text.</p>",
      pdfUrl: "/uploads/legacy.pdf",
      pdfLabel: null,
    });

    const { container } = render(<ArticleView post={post} />);
    const chips = container.querySelectorAll("a.pdf-link-block");

    expect(chips).toHaveLength(1);
    expect(chips[0].getAttribute("href")).toBe("/uploads/legacy.pdf");
    expect(chips[0].textContent).toBe(DEFAULT_PDF_LABEL);
    expect(chips[0].getAttribute("target")).toBe("_blank");
    expect(chips[0].getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does not duplicate the chip when the content already has an inline block", () => {
    const post = makePost({
      content:
        '<p>Intro.</p><a class="pdf-link-block" href="/uploads/inline.pdf" ' +
        'target="_blank" rel="noopener noreferrer" ' +
        'data-pdf-label="Inline PDF">Inline PDF</a><p>Outro.</p>',
      // Even with a legacy pdfUrl present, the inline block must win with no
      // second chip appended.
      pdfUrl: "/uploads/legacy.pdf",
      pdfLabel: null,
    });

    const { container } = render(<ArticleView post={post} />);
    const chips = container.querySelectorAll("a.pdf-link-block");

    expect(chips).toHaveLength(1);
    expect(chips[0].getAttribute("href")).toBe("/uploads/inline.pdf");
  });

  it("renders no chip when there is neither a pdfUrl nor an inline block", () => {
    const post = makePost({ content: "<p>Nothing here.</p>", pdfUrl: null });

    const { container } = render(<ArticleView post={post} />);

    expect(container.querySelectorAll("a.pdf-link-block")).toHaveLength(0);
  });
});

describe("ArticleView featured image", () => {
  const featuredImage = {
    id: "img-1",
    url: "/uploads/hero.webp",
    fileName: "hero.webp",
  };

  it("renders the featured image when showFeaturedImage is true", () => {
    const post = makePost({ featuredImage, showFeaturedImage: true });

    const { container } = render(<ArticleView post={post} />);

    expect(container.querySelector("figure img")).not.toBeNull();
  });

  it("hides the featured image when showFeaturedImage is false", () => {
    const post = makePost({ featuredImage, showFeaturedImage: false });

    const { container } = render(<ArticleView post={post} />);

    expect(container.querySelector("figure img")).toBeNull();
  });
});

// The rendered page, not just the HTML transform: the article must present one
// H1 (its title) with real H2/H3 section headings beneath it. Before this, the
// editor's `<p class="heading-2">` output meant the page had no <h2> at all.
describe("ArticleView heading semantics", () => {
  it("renders exactly one h1 — the article title", () => {
    const { container } = render(
      <ArticleView
        post={makePost({
          title: "Nepal Income Tax Act 2058",
          content:
            '<p class="heading-2">Overview</p><p>Body</p>' +
            '<p class="heading-2">Compliance</p>',
        })}
      />,
    );

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe("Nepal Income Tax Act 2058");
  });

  it("renders body sections as real h2/h3 elements", () => {
    const { container } = render(
      <ArticleView
        post={makePost({
          content:
            '<p class="heading-2">Chapter One</p>' +
            '<p class="heading-3">Part A</p>' +
            '<p class="heading-3">Part B</p>' +
            '<p class="heading-2">Chapter Two</p>',
        })}
      />,
    );

    const body = container.querySelector(".article-body");
    expect(body).not.toBeNull();

    const levels = [...body!.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (el) => el.tagName.toLowerCase(),
    );
    expect(levels).toEqual(["h2", "h3", "h3", "h2"]);
    // No stray heading paragraphs left behind.
    expect(body!.querySelectorAll("p.heading-2")).toHaveLength(0);
  });

  it("keeps the styling class so the visual result is unchanged", () => {
    const { container } = render(
      <ArticleView post={makePost({ content: '<p class="heading-2">Styled</p>' })} />,
    );

    const heading = container.querySelector(".article-body h2");
    expect(heading?.classList.contains("heading-2")).toBe(true);
  });

  it("does not add a second h1 for a legacy article containing one", () => {
    const { container } = render(
      <ArticleView
        post={makePost({ content: "<h1>Legacy top</h1><h2>Legacy sub</h2>" })}
      />,
    );

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    const levels = [
      ...container.querySelector(".article-body")!.querySelectorAll("h1,h2,h3"),
    ].map((el) => el.tagName.toLowerCase());
    expect(levels).toEqual(["h2", "h2"]);
  });

  it("anchors Nepali headings so the contents rail can link to them", () => {
    const { container } = render(
      <ArticleView
        post={makePost({ content: '<p class="heading-2">नेपाली कर कानून</p>' })}
      />,
    );

    const heading = container.querySelector(".article-body h2");
    expect(heading?.id).toBe("नेपाली-कर-कानून");
  });
});
