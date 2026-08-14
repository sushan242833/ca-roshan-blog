import { describe, expect, it } from "vitest";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  serializeJsonLd,
} from "@/lib/structured-data";

const post = {
  title: "Nepal Income Tax Act 2058",
  slug: "nepal-income-tax-act-2058",
  excerpt: "A practical guide.",
  metaDescription: "A practical guide to the 2058 Act.",
  publishedAt: "2026-01-05T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  author: { name: "CA Roshan" },
  featuredImage: { url: "https://cdn.example.com/cover.png" },
};

describe("buildArticleSchema", () => {
  it("describes the article with the values the page displays", () => {
    const schema = buildArticleSchema(post);

    expect(schema["@type"]).toBe("Article");
    expect(schema.headline).toBe(post.title);
    expect(schema.datePublished).toBe(post.publishedAt);
    expect(schema.dateModified).toBe(post.updatedAt);
    expect(schema.author).toEqual({ "@type": "Person", name: "CA Roshan" });
    expect(schema.image).toEqual([post.featuredImage.url]);
  });

  it("falls back to createdAt when a post was never published", () => {
    const schema = buildArticleSchema({ ...post, publishedAt: null });
    expect(schema.datePublished).toBe(post.createdAt);
  });

  it("omits the image when the page does not render one", () => {
    // Structured data must not claim something the page does not show.
    const schema = buildArticleSchema({ ...post, featuredImage: null });
    expect("image" in schema).toBe(false);
  });

  it("percent-encodes a Nepali slug in the canonical URL", () => {
    const schema = buildArticleSchema({ ...post, slug: "नेपाली-कर-कानून" });
    expect(schema.url).toContain(encodeURIComponent("नेपाली-कर-कानून"));
  });
});

describe("buildBreadcrumbSchema", () => {
  it("numbers the trail from one, in order", () => {
    const schema = buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blogs", path: "/blogs" },
      { name: post.title, path: `/blogs/${post.slug}` },
    ]);

    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(schema.itemListElement[2].name).toBe(post.title);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a title cannot break out of the script tag", () => {
    // Without this, a post titled '</script><img onerror=...>' would inject
    // markup into every page rendering its structured data.
    const output = serializeJsonLd({
      headline: "</script><img src=x onerror=alert(1)>",
    });

    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<img");
    expect(output).toContain("\\u003c");
  });

  it("round-trips to the same object", () => {
    const schema = buildArticleSchema(post);
    expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
  });
});
