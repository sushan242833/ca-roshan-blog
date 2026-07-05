import { describe, expect, it } from "vitest";
import { postFormSchema } from "@/components/admin/post-editor";
import {
  MAX_META_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
} from "@/lib/constants";

const validValues = {
  title: "Understanding Capital Gains",
  slug: "",
  content: "<p>Real content.</p>",
  excerpt: "",
  categoryId: "",
  tagIds: [],
  featuredImageId: null,
  metaTitle: "",
  metaDescription: "",
  featured: false,
};

function issuePaths(values: unknown): string[] {
  const result = postFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("postFormSchema", () => {
  it("accepts a valid payload", () => {
    expect(postFormSchema.safeParse(validValues).success).toBe(true);
  });

  it("rejects a missing title", () => {
    expect(issuePaths({ ...validValues, title: "" })).toContain("title");
  });

  it("rejects a whitespace-only title", () => {
    expect(issuePaths({ ...validValues, title: "   " })).toContain("title");
  });

  it(`rejects a metaTitle longer than ${MAX_META_TITLE_LENGTH} characters`, () => {
    const tooLong = "x".repeat(MAX_META_TITLE_LENGTH + 1);
    expect(issuePaths({ ...validValues, metaTitle: tooLong })).toContain(
      "metaTitle",
    );
    expect(
      postFormSchema.safeParse({
        ...validValues,
        metaTitle: "x".repeat(MAX_META_TITLE_LENGTH),
      }).success,
    ).toBe(true);
  });

  it(`rejects a metaDescription longer than ${MAX_META_DESCRIPTION_LENGTH} characters`, () => {
    const tooLong = "x".repeat(MAX_META_DESCRIPTION_LENGTH + 1);
    expect(issuePaths({ ...validValues, metaDescription: tooLong })).toContain(
      "metaDescription",
    );
    expect(
      postFormSchema.safeParse({
        ...validValues,
        metaDescription: "x".repeat(MAX_META_DESCRIPTION_LENGTH),
      }).success,
    ).toBe(true);
  });

  it("rejects content that is empty after stripping tags", () => {
    expect(
      issuePaths({ ...validValues, content: "<p>&nbsp;</p>".replace("&nbsp;", " ") }),
    ).toContain("content");
    expect(issuePaths({ ...validValues, content: "<p></p><br/>" })).toContain(
      "content",
    );
  });
});
