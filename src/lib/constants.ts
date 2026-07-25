// Pagination
export const POSTS_PER_PAGE = 9;
export const ADMIN_POSTS_PER_PAGE = 10;
export const ADMIN_SUBSCRIBERS_PER_PAGE = 20;
// The admin post list endpoint only sorts by createdAt — fetch a larger pool
// and re-sort by updatedAt client-side, then trim to the display count.
export const ADMIN_DASHBOARD_ACTIVITY_FETCH_LIMIT = 20;
export const ADMIN_DASHBOARD_ACTIVITY_DISPLAY_LIMIT = 5;

// Search
export const SEARCH_DEBOUNCE_MS = 350;

// Validation limits — must mirror the backend exactly
export const MAX_META_TITLE_LENGTH = 60;
export const MAX_META_DESCRIPTION_LENGTH = 160;
// Frontend-only soft cap; the backend accepts any excerpt length.
export const MAX_EXCERPT_LENGTH = 300;
// Full content PDF link — must mirror the backend validation limits.
export const MAX_PDF_URL_LENGTH = 2048;
export const MAX_PDF_LABEL_LENGTH = 255;
export const DEFAULT_PDF_LABEL = "Read the full content (PDF)";
export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 500;
export const MAX_TAG_NAME_LENGTH = 100;
export const MAX_CONTACT_MESSAGE_LENGTH = 5000;
export const MAX_CONTACT_NAME_LENGTH = 100;

// Media upload
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf"];
export const MAX_DOCUMENT_SIZE_MB = 20;

// Preview tokens
export const PREVIEW_TOKEN_EXPIRY_MINUTES = 60;

// Auth session — presence-only cookie checked by proxy.ts
export const SESSION_COOKIE_NAME = "ca_roshan_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // mirrors backend refresh token lifetime
