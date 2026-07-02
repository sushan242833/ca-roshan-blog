import type { ReactNode } from "react";
import Header from "@/components/layout/header";

export default function NewsletterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
