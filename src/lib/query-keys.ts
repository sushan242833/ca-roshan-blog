// Central registry of React Query keys. Every admin screen imports its keys
// from here so that keys used in more than one file stay byte-identical —
// this is what makes cross-screen cache sync work (e.g. creating a category
// on Manage Categories updates the post editor's dropdown, because both read
// ["categories"]; publishing a post anywhere refreshes every ["postStats"]
// reader). Never inline a key string in a component; add it here instead.

export interface PostListFilters {
  status: string;
  search: string;
  page: number;
}

export interface SubscriberListFilters {
  status: string;
  search: string;
  page: number;
}

export const queryKeys = {
  // Reference data — shared by the management screens AND the post editor.
  categories: ["categories"] as const,
  tags: ["tags"] as const,

  // Posts list + stats. The list is filtered; changing any filter changes the
  // key, which is how React Query refetches without manual wiring.
  posts: (filters: PostListFilters) => ["posts", filters] as const,
  postsAll: ["posts"] as const,
  postStats: ["postStats"] as const,
  post: (id: string) => ["post", id] as const,

  // Media — shared by the Media Library and the media picker dialog.
  media: ["media"] as const,
  // Kind-filtered media list (e.g. the PDF picker), kept separate from the
  // unfiltered ["media"] cache so the two lists never overwrite each other.
  mediaByType: (type: "image" | "document") => ["media", type] as const,

  // Subscribers (read-only).
  subscribers: (filters: SubscriberListFilters) =>
    ["subscribers", filters] as const,
  subscriberStats: ["subscriberStats"] as const,

  // Dashboard recent-activity list (admin list, sorted client-side).
  dashboardRecent: ["dashboardRecent"] as const,
} as const;
