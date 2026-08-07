export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface TaxonomyResponse {
  id: string;
  name: string;
  slug: string;
}

export interface AuthorResponse {
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface FeaturedImageResponse {
  id: string;
  url: string;
  fileName: string;
}

export interface PostSummaryResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: PostStatus;
  featured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  // Optional "Full content PDF" link. The backend returns these on every
  // summary payload, not just the detail one.
  pdfUrl: string | null;
  pdfLabel: string | null;
  featuredImage: FeaturedImageResponse | null;
  // Whether the featured image is rendered at the top of the detail page.
  showFeaturedImage: boolean;
  category: TaxonomyResponse | null;
  categories: TaxonomyResponse[];
  tags: TaxonomyResponse[];
  author: AuthorResponse | null;
  readingTime: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetailResponse extends PostSummaryResponse {
  content: string;
}

export interface PreviewTokenResponse {
  token: string;
  expiresAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Mirror of the backend chapter DTOs.

export interface ChapterSummary {
  id: string;
  title: string;
  order: number;
  /** One-line summary shown under the title in chapter listings. */
  excerpt: string | null;
}

// GET /v1/posts/:slug/chapters
export interface ChapterIndexResponse extends PostSummaryResponse {
  paginated: boolean;
  totalChapters: number;
  chapters: ChapterSummary[];
  content: string | null;
}

// GET /v1/posts/:slug/chapters/:chapterId
export interface ChapterDetailResponse extends PostSummaryResponse {
  totalChapters: number;
  chapter: {
    id: string;
    title: string;
    order: number;
    html: string;
    excerpt: string | null;
  };
  prev: ChapterSummary | null;
  next: ChapterSummary | null;
}
