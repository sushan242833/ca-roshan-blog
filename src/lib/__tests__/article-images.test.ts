import { describe, expect, it } from "vitest";
import {
  optimizeArticleImages,
  optimizeCloudinaryUrl,
} from "@/lib/article-images";

const CLOUD = "https://res.cloudinary.com/jsewsq7w/image/upload";
// The real shape stored by the media upload driver: version, folder, UUID name.
const ORIGINAL = `${CLOUD}/v1785565849/ca-roshan-blog/d428ad8a.png`;
const OPTIMIZED = `${CLOUD}/f_auto,q_auto,w_1200/v1785565849/ca-roshan-blog/d428ad8a.png`;

describe("optimizeCloudinaryUrl", () => {
  it("inserts the transformations ahead of the version segment", () => {
    expect(optimizeCloudinaryUrl(ORIGINAL)).toBe(OPTIMIZED);
  });

  it("handles a URL with no version or folder", () => {
    expect(optimizeCloudinaryUrl(`${CLOUD}/photo.png`)).toBe(
      `${CLOUD}/f_auto,q_auto,w_1200/photo.png`,
    );
  });

  it("is a no-op when the transformations are already there", () => {
    expect(optimizeCloudinaryUrl(OPTIMIZED)).toBe(OPTIMIZED);
  });

  it("keeps a width the URL already specifies and adds only what is missing", () => {
    expect(
      optimizeCloudinaryUrl(`${CLOUD}/c_fill,w_800/v1/ca-roshan-blog/a.png`),
    ).toBe(`${CLOUD}/f_auto,q_auto,c_fill,w_800/v1/ca-roshan-blog/a.png`);
  });

  it("keeps an explicitly chosen format", () => {
    expect(optimizeCloudinaryUrl(`${CLOUD}/f_webp/v1/a.png`)).toBe(
      `${CLOUD}/q_auto,w_1200,f_webp/v1/a.png`,
    );
  });

  it("leaves non-Cloudinary hosts untouched", () => {
    const external = "https://example.com/image/upload/v1/a.png";
    expect(optimizeCloudinaryUrl(external)).toBe(external);
  });

  it("leaves relative and malformed sources untouched", () => {
    expect(optimizeCloudinaryUrl("/local/a.png")).toBe("/local/a.png");
    expect(optimizeCloudinaryUrl("")).toBe("");
  });

  it("leaves non-image delivery types untouched", () => {
    const video = "https://res.cloudinary.com/x/video/upload/v1/a.mp4";
    expect(optimizeCloudinaryUrl(video)).toBe(video);
  });

  it("does not mistake a folder containing an underscore for transformations", () => {
    // "tax_2083" parses like a transformation component but "tax" is not a
    // Cloudinary key, so it must be treated as a folder.
    expect(optimizeCloudinaryUrl(`${CLOUD}/tax_2083/a.png`)).toBe(
      `${CLOUD}/f_auto,q_auto,w_1200/tax_2083/a.png`,
    );
  });

  it("does not rewrite a bare public id that looks like a transformation", () => {
    expect(optimizeCloudinaryUrl(`${CLOUD}/my_photo.png`)).toBe(
      `${CLOUD}/f_auto,q_auto,w_1200/my_photo.png`,
    );
  });
});

describe("optimizeArticleImages", () => {
  it("keeps the first image eager and lazy-loads the rest", () => {
    const html = `<p><img src="${ORIGINAL}" /></p><p><img src="${ORIGINAL}" /></p>`;
    const out = optimizeArticleImages(html);

    expect(out).toContain('loading="eager" fetchpriority="high"');
    expect((out.match(/loading="lazy"/g) ?? []).length).toBe(1);
    expect((out.match(/decoding="async"/g) ?? []).length).toBe(2);
  });

  it("rewrites the src of every body image", () => {
    const html = `<img src="${ORIGINAL}"><img src="${ORIGINAL}">`;
    const out = optimizeArticleImages(html);

    expect((out.match(/f_auto,q_auto,w_1200/g) ?? []).length).toBe(2);
    expect(out).not.toContain(`upload/v1785565849`);
  });

  it("preserves alt, class and any dimensions already present", () => {
    const out = optimizeArticleImages(
      `<img src="${ORIGINAL}" alt="A chart" width="800" height="600" class="x">`,
    );

    expect(out).toContain('alt="A chart"');
    expect(out).toContain('width="800"');
    expect(out).toContain('height="600"');
    expect(out).toContain('class="x"');
  });

  it("still adds loading hints to a non-Cloudinary image", () => {
    const out = optimizeArticleImages('<img src="https://example.com/a.png">');

    expect(out).toContain('src="https://example.com/a.png"');
    expect(out).toContain('decoding="async"');
  });

  it("handles a single-quoted src", () => {
    const out = optimizeArticleImages(`<img src='${ORIGINAL}'>`);

    expect(out).toContain(`src="${OPTIMIZED}"`);
  });

  it("does not duplicate attributes when run twice", () => {
    const once = optimizeArticleImages(`<img src="${ORIGINAL}">`);
    const twice = optimizeArticleImages(once);

    expect(twice).toBe(once);
  });

  it("leaves HTML without images alone", () => {
    const html = "<p>No pictures here</p>";
    expect(optimizeArticleImages(html)).toBe(html);
  });
});
