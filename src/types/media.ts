// Mirrors the backend's MediaResponseDto (media.controller.ts).
export interface MediaResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}
