export type SubscriberStatus = "PENDING" | "ACTIVE" | "UNSUBSCRIBED";

// Mirrors the backend's SubscriberResponse (dto/subscriber.dto.ts).
export interface SubscriberResponse {
  id: string;
  email: string;
  status: SubscriberStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberStatsResponse {
  total: number;
  pending: number;
  active: number;
  unsubscribed: number;
}
