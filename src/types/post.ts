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
  featuredImage: FeaturedImageResponse | null;
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
  metaTitle: string | null;
  metaDescription: string | null;
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
