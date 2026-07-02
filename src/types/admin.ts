import type { AboutPageResponse } from "./about";

export interface AuthenticatedAdminResponse extends AboutPageResponse {
  id: string;
  email: string;
}
