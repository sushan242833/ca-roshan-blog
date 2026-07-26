"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Search,
  UserMinus,
  Users,
} from "lucide-react";
import Spinner from "@/components/ui/spinner";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatPostDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import {
  ADMIN_SUBSCRIBERS_PER_PAGE,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getPageNumbers } from "@/components/blogs/pagination";
import FormMessage from "@/components/ui/form-message";
import type {
  SubscriberResponse,
  SubscriberStatsResponse,
  SubscriberStatus,
} from "@/types/subscriber";
import type { PaginationMeta, PaginatedResponse } from "@/types/post";

type StatusTab = SubscriberStatus | "ALL";

interface TabDefinition {
  key: StatusTab;
  label: string;
  count: (stats: SubscriberStatsResponse) => number;
}

const TABS: TabDefinition[] = [
  { key: "ALL", label: "All", count: (stats) => stats.total },
  { key: "ACTIVE", label: "Active", count: (stats) => stats.active },
  { key: "PENDING", label: "Pending", count: (stats) => stats.pending },
  {
    key: "UNSUBSCRIBED",
    label: "Unsubscribed",
    count: (stats) => stats.unsubscribed,
  },
];

const STATUS_LABEL: Record<SubscriberStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  UNSUBSCRIBED: "Unsubscribed",
};

const STATUS_BADGE_CLASS: Record<SubscriberStatus, string> = {
  ACTIVE: "border-brand-teal/20 bg-brand-teal/10 text-brand-teal",
  PENDING: "border-gray-200 bg-gray-100 text-gray-600",
  UNSUBSCRIBED: "border-amber-200 bg-amber-100 text-amber-700",
};

const EMPTY_MESSAGE: Record<StatusTab, string> = {
  ALL: "No subscribers yet.",
  ACTIVE: "No active subscribers.",
  PENDING: "No pending subscribers.",
  UNSUBSCRIBED: "No unsubscribed subscribers.",
};

interface StatCard {
  label: string;
  value: number;
  icon: typeof Users;
  iconClass: string;
}

function buildStatCards(stats: SubscriberStatsResponse): StatCard[] {
  return [
    {
      label: "Total Subscribers",
      value: stats.total,
      icon: Users,
      iconClass: "bg-gray-100 text-brand-navy",
    },
    {
      label: "Active",
      value: stats.active,
      icon: CheckCircle2,
      iconClass: "bg-brand-teal/10 text-brand-teal",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      iconClass: "bg-gray-100 text-gray-500",
    },
    {
      label: "Unsubscribed",
      value: stats.unsubscribed,
      icon: UserMinus,
      iconClass: "bg-amber-100 text-amber-700",
    },
  ];
}

// READ-ONLY screen: the backend exposes no admin create/edit/delete for
// subscribers — they manage themselves via the public subscribe/unsubscribe
// flows.
export default function AdminSubscribersPage() {
  const { authedFetch } = useAuth();

  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search — skipped when the input already matches the applied
  // search (e.g. on mount), so the page isn't reset needlessly.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, search]);

  // Filters are the query key, so tab/search/page changes refetch on their own.
  const subscribersQuery = useQuery({
    queryKey: queryKeys.subscribers({ status: statusTab, search, page }),
    queryFn: () => {
      const query = [
        `page=${page}`,
        `limit=${ADMIN_SUBSCRIBERS_PER_PAGE}`,
        statusTab !== "ALL" && `status=${statusTab}`,
        search && `search=${encodeURIComponent(search)}`,
      ]
        .filter(Boolean)
        .join("&");
      return authedFetch<PaginatedResponse<SubscriberResponse>>(
        `/v1/admin/subscribers?${query}`,
      );
    },
  });

  // Stat cards and tab counts are non-critical — the page renders without
  // them if the stats fetch fails.
  const statsQuery = useQuery({
    queryKey: queryKeys.subscriberStats,
    queryFn: () =>
      authedFetch<SubscriberStatsResponse>("/v1/admin/subscribers/stats"),
  });

  const subscribers = subscribersQuery.data?.items ?? [];
  const pagination: PaginationMeta | null =
    subscribersQuery.data?.pagination ?? null;
  const stats = statsQuery.data ?? null;
  const isLoading = subscribersQuery.isPending;
  const error = subscribersQuery.isError
    ? subscribersQuery.error instanceof ApiRequestError
      ? subscribersQuery.error.message
      : "Failed to load subscribers."
    : "";

  const selectTab = (tab: StatusTab) => {
    setStatusTab(tab);
    setPage(1);
  };

  const isSearching = search.length > 0;
  const totalPages = pagination?.totalPages ?? 0;
  const rangeStart = pagination
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-brand-navy">
        Subscribers
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage and monitor newsletter subscribers.
      </p>

      {stats && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {buildStatCards(stats).map((card) => (
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
                {card.value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="mt-6 flex overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => {
          const active = tab.key === statusTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-teal text-brand-teal"
                  : "border-transparent text-gray-500 hover:text-brand-teal"
              }`}
            >
              {tab.label}
              {stats && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {tab.count(stats)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mt-6 w-full max-w-xs">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Filter emails…"
          aria-label="Search subscribers by email"
          className="pl-9"
        />
      </div>

      {error && (
        <FormMessage type="error" className="mt-6" message={error} />
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Spinner size={18} />
          Loading subscribers…
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          {subscribers.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-400">
              {isSearching
                ? "No subscribers match your search."
                : EMPTY_MESSAGE[statusTab]}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Subscribed
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Verified
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="px-6 py-4 text-sm font-medium text-brand-navy">
                        {subscriber.email}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[subscriber.status]}`}
                        >
                          {STATUS_LABEL[subscriber.status]}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500">
                        {formatPostDate(subscriber.createdAt)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500">
                        {subscriber.verifiedAt
                          ? formatPostDate(subscriber.verifiedAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination footer */}
              {pagination && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
                  <p className="text-sm text-gray-500">
                    Showing {rangeStart} to {rangeEnd} of {pagination.total}{" "}
                    results
                  </p>
                  {totalPages > 1 && (
                    <nav
                      className="flex items-center gap-1"
                      aria-label="Pagination"
                    >
                      <button
                        type="button"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {getPageNumbers(page, totalPages).map((p, index) =>
                        p === "…" ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-sm text-gray-400"
                            aria-hidden="true"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            aria-current={p === page ? "page" : undefined}
                            aria-label={`Page ${p}`}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              p === page
                                ? "border-brand-teal-dark bg-brand-teal-dark text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
