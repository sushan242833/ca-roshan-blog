import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// NOTE: This layout currently has no authentication guard. Middleware-
// based route protection will be added in a separate follow-up task.
