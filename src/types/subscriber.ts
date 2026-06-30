export type SubscriberStatus = "PENDING" | "ACTIVE" | "UNSUBSCRIBED";

export interface SubscriberResponse {
  id: string;
  email: string;
  status: SubscriberStatus;
  createdAt: string;
}
