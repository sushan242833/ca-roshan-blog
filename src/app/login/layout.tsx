import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthProvider from "@/components/providers/auth-provider";

// The login page must never appear in search indexes. The page itself is a
// client component, so the robots metadata lives on its route layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
