export interface AuthenticatedAdminResponse {
  id: string;
  name: string;
  email: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
}
