export type SubscriberStatus = "ACTIVE" | "UNSUBSCRIBED";

// Mirrors the backend's SubscriberResponse (dto/subscriber.dto.ts).
export interface SubscriberResponse {
  id: string;
  email: string;
  status: SubscriberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberStatsResponse {
  total: number;
  active: number;
  unsubscribed: number;
}
