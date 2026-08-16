export type MediaKind = "image" | "document";

export interface MediaResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  url: string;
  provider: string;
  inUse: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MediaUsageRole = "featuredImage" | "content" | "pdf";

export interface MediaUsagePostReference {
  postId: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  trashed: boolean;
  usedAs: MediaUsageRole[];
}

export interface MediaUsage {
  inUse: boolean;
  posts: MediaUsagePostReference[];
  usedByAuthorAvatar: boolean;
}
