// Image vs document, derived from the MIME type on the backend.
export type MediaKind = "image" | "document";

// Mirrors the backend's MediaResponseDto (media.controller.ts).
export interface MediaResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  url: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}
