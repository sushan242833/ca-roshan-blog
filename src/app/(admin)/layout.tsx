"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  Settings,
} from "lucide-react";
import { SITE_NAME } from "@/config/site.config";

interface AdminNavItem {
  label: string;
  href: string;
  icon: typeof Settings;
  disabled?: boolean;
}

// TODO: wire up Dashboard, Manage Posts, Categories, and Subscribers once
// their respective admin pages are built in later phases.
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, disabled: true },
  { label: "Manage Posts", href: "/posts", icon: FileText, disabled: true },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, disabled: true },
  { label: "Subscribers", href: "/subscribers", icon: Users, disabled: true },
  { label: "Settings", href: "/admin/about", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="px-6 py-5">
          <span className="font-serif text-lg font-bold text-brand-navy">
            {SITE_NAME}
          </span>
          <p className="text-xs text-gray-400">Admin Dashboard</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title="Coming soon"
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300"
                >
                  <Icon size={18} />
                  {item.label}
                </span>
              );
            }

            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-brand-teal/10 font-medium text-brand-teal"
                    : "text-gray-600 hover:bg-gray-100 hover:text-brand-navy",
                ].join(" ")}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// NOTE: This layout currently has no authentication guard. Middleware-
// based route protection will be added in a separate follow-up task.
