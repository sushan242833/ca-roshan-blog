import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminLayoutClient from "./admin-layout-client";

// The admin area must never appear in search indexes. Metadata can only be
// exported from a server component, so the interactive shell lives in
// admin-layout-client.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
