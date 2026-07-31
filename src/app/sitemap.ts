import type { MetadataRoute } from "next";
import { apiRequest } from "@/lib/api";
import { FEATURES } from "@/config/features";
import { SITE_URL } from "@/config/site.config";
import { SITEMAP_REVALIDATE_SECONDS } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";
import type { CategoryResponse } from "@/types/category";

const STATIC_PATHS = [
  "/",
  "/blogs",
  "/categories",
  "/about",
  ...(FEATURES.contactPage ? ["/contact"] : []),
];
const SITEMAP_POSTS_PAGE_SIZE = 100;

export const revalidate = SITEMAP_REVALIDATE_SECONDS;

// GET /v1/posts only returns published posts; walk every page so the sitemap
// stays complete beyond the first page.
async function fetchAllPublishedPosts(): Promise<PostSummaryResponse[]> {
  const posts: PostSummaryResponse[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await apiRequest<PaginatedResponse<PostSummaryResponse>>(
      `/v1/posts?page=${page}&limit=${SITEMAP_POSTS_PAGE_SIZE}`,
      { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } },
    );
    posts.push(...data.items);
    totalPages = data.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
  }));

  // Each backend fetch degrades independently: if the API is unreachable at
  // build/request time the sitemap still serves the static entries.
  try {
    const posts = await fetchAllPublishedPosts();
    entries.push(
      ...posts.map((post) => ({
        url: `${SITE_URL}/blogs/${post.slug}`,
        lastModified: new Date(post.updatedAt),
      })),
    );
  } catch (err) {
    console.error("Sitemap: failed to fetch posts:", err);
  }

  try {
    const categories = await apiRequest<CategoryResponse[]>(
      "/v1/categories",
      { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } },
    );
    entries.push(
      ...categories.map((category) => ({
        url: `${SITE_URL}/categories/${category.slug}`,
      })),
    );
  } catch (err) {
    console.error("Sitemap: failed to fetch categories:", err);
  }

  return entries;
}
