"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Tag,
  Image as ImageIcon,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { SITE_NAME } from "@/config/site.config";
import AuthProvider, { useAuth } from "@/components/providers/auth-provider";
import AdminGuard from "@/components/admin/admin-guard";

interface AdminNavItem {
  label: string;
  href: string;
  icon: typeof Settings;
  disabled?: boolean;
}

// TODO: wire up Manage Posts, Categories, Tags, Media, and Subscribers once
// their respective admin pages are built in later phases.
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Manage Posts",
    href: "/admin/posts",
    icon: FileText,
    disabled: true,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    disabled: true,
  },
  { label: "Tags", href: "/admin/tags", icon: Tag, disabled: true },
  { label: "Media", href: "/admin/media", icon: ImageIcon, disabled: true },
  {
    label: "Subscribers",
    href: "/admin/subscribers",
    icon: Users,
    disabled: true,
  },
  { label: "Settings", href: "/admin/settings/about", icon: Settings },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="px-6 py-5">
          <span className="font-serif text-lg font-bold text-brand-navy">
            {SITE_NAME}
          </span>
          <p className="text-xs text-gray-400">Admin Dashboard</p>
        </div>

        {admin && (
          <div className="flex items-center gap-3 border-y border-gray-100 px-6 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-white">
              {getInitials(admin.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-navy">
                {admin.name}
              </p>
              <p className="truncate text-xs text-gray-400">{admin.email}</p>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
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

        <div className="border-t border-gray-200 px-3 py-4">
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    </AuthProvider>
  );
}
