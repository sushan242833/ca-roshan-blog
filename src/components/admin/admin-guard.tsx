"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/spinner";
import { useAuth } from "@/components/providers/auth-provider";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { admin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace("/login");
    }
  }, [isLoading, admin, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner size={32} className="text-brand-teal" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return <>{children}</>;
}
