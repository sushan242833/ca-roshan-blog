// Shape of GET /api/v1/auth/me — mirrors the backend AdminProfileResponse.
// title/bio/avatarUrl are the author-byline fields carried on post responses;
// the About page no longer draws from any of this.
export interface AdminProfileResponse {
  id: string;
  name: string;
  email: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}
