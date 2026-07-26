import type { AboutPageResponse } from "./about";

// Shape of GET /api/v1/auth/me — mirrors the backend AdminProfileResponse DTO
// (the About-page profile fields plus id and email).
export interface AdminProfileResponse extends AboutPageResponse {
  id: string;
  email: string;
}
