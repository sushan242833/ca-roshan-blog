"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, PenLine, Users, Loader2 } from "lucide-react";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatRelativeTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import {
  ADMIN_DASHBOARD_ACTIVITY_FETCH_LIMIT,
  ADMIN_DASHBOARD_ACTIVITY_DISPLAY_LIMIT,
} from "@/lib/constants";
import type { DashboardStatsResponse } from "@/types/dashboard";
import type { PaginatedResponse, PostStatus, PostSummaryResponse } from "@/types/post";

const STATUS_LABEL: Record<PostStatus, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

const STATUS_BADGE_CLASS: Record<PostStatus, string> = {
  PUBLISHED: "bg-brand-teal/10 text-brand-teal",
  DRAFT: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

interface StatCard {
  label: string;
  value: number;
  icon: typeof FileText;
  iconClass: string;
}

export default function AdminDashboardPage() {
  const { authedFetch } = useAuth();

  // Stats share the ["postStats"] key with Manage Posts and the editor, so a
  // publish/transition anywhere refetches this card together with them.
  const statsQuery = useQuery({
    queryKey: queryKeys.postStats,
    queryFn: () => authedFetch<DashboardStatsResponse>("/v1/posts/admin/stats"),
  });
  const recentQuery = useQuery({
    queryKey: queryKeys.dashboardRecent,
    queryFn: () =>
      authedFetch<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts/admin/list?page=1&limit=${ADMIN_DASHBOARD_ACTIVITY_FETCH_LIMIT}`,
      ),
  });

  const stats = statsQuery.data ?? null;
  const recentPosts = recentQuery.data
    ? [...recentQuery.data.items]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, ADMIN_DASHBOARD_ACTIVITY_DISPLAY_LIMIT)
    : [];

  const isLoading = statsQuery.isPending || recentQuery.isPending;
  const errorSource = statsQuery.error ?? recentQuery.error;
  const error = errorSource
    ? errorSource instanceof ApiRequestError
      ? errorSource.message
      : "Failed to load dashboard data."
    : "";

  const statCards: StatCard[] = stats
    ? [
        {
          label: "Total Posts",
          value: stats.totalPosts,
          icon: FileText,
          iconClass: "bg-gray-100 text-brand-navy",
        },
        {
          label: "Published",
          value: stats.published,
          icon: CheckCircle2,
          iconClass: "bg-brand-teal/10 text-brand-teal",
        },
        {
          label: "Drafts",
          value: stats.drafts,
          icon: PenLine,
          iconClass: "bg-amber-100 text-amber-700",
        },
        {
          label: "Total Subscribers",
          value: stats.totalSubscribers,
          icon: Users,
          iconClass: "bg-blue-100 text-blue-700",
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-brand-navy">
        Overview
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Monitor your publication and recent activity.
      </p>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Loading dashboard…
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${card.iconClass}`}
                >
                  <card.icon size={20} />
                </span>
                <p className="mt-4 text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 font-serif text-3xl font-bold text-brand-navy">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-serif text-lg font-bold text-brand-navy">
                Recent Activity
              </h2>
            </div>

            {recentPosts.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                No posts yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentPosts.map((post) => (
                  <li
                    key={post.id}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-navy">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Last edited {formatRelativeTime(post.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[post.status]}`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-gray-200 px-6 py-4 text-center">
              <Link
                href="/admin/posts"
                className="inline-block rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-gray-50"
              >
                View All Activity
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
