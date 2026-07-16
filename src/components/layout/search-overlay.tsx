"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import PostCard from "@/components/posts/post-card";
import { SearchIcon, XIcon } from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// "done" covers both "results ready" and "zero results" — the results array
// distinguishes them. A small preview count keeps the overlay instant; the
// full, paginated experience is the existing /blog?search= page.
type Status = "loading" | "error" | "done";
const RESULT_LIMIT = 5;

export default function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummaryResponse[]>([]);
  const [status, setStatus] = useState<Status>("done");
  // Guards against out-of-order responses: only the latest request may commit.
  const requestIdRef = useRef(0);

  const trimmed = query.trim();

  // Typing drives the visible state synchronously (event handler, not an
  // effect): loading as soon as there's a term, cleared when emptied.
  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim()) {
      setStatus("loading");
    } else {
      setResults([]);
      setStatus("done");
    }
  }

  // Debounced fetch. The effect only kicks off the request and commits state
  // from its async callbacks — no synchronous setState in the effect body.
  // No request is fired for an empty/whitespace query.
  useEffect(() => {
    if (!trimmed) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?search=${encodeURIComponent(trimmed)}&limit=${RESULT_LIMIT}`,
      )
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          setResults(data.items);
          setStatus("done");
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setStatus("error");
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  // Reset on close so the next open starts clean — done in the change handler
  // (covers Escape, outside-click, the close button, and result clicks) rather
  // than an effect.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setResults([]);
      setStatus("done");
      requestIdRef.current += 1; // discard any in-flight response
    }
    onOpenChange(next);
  }

  // Enter (form submit) and the "View all" link share this: reuse the existing
  // full listing page rather than a second results page.
  function goToAllResults() {
    if (!trimmed) return;
    router.push(`/blog?search=${encodeURIComponent(trimmed)}`);
    handleOpenChange(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    goToAllResults();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-20 left-1/2 max-w-2xl -translate-x-1/2 translate-y-0 gap-0 p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Search articles</DialogTitle>

        {/* Input row */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-b border-gray-200 px-4 py-3"
        >
          <SearchIcon size={18} className="shrink-0 text-gray-400" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search articles..."
            aria-label="Search articles"
            className="w-full bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          {status === "loading" && (
            <Loader2 size={16} className="shrink-0 animate-spin text-gray-400" />
          )}
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            aria-label="Close search"
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-navy"
          >
            <XIcon size={18} />
          </button>
        </form>

        {/* Results / states */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!trimmed ? (
            <p className="px-3 py-8 text-center text-sm text-gray-400">
              Start typing to search articles...
            </p>
          ) : status === "error" ? (
            <p className="px-3 py-8 text-center text-sm text-gray-500">
              Something went wrong while searching. Please try again.
            </p>
          ) : results.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {results.map((post) => (
                <li key={post.id}>
                  <PostCard
                    post={post}
                    variant="compact"
                    onClick={() => handleOpenChange(false)}
                  />
                </li>
              ))}
            </ul>
          ) : status === "loading" ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-gray-500">
              No articles found for “{trimmed}”.
            </p>
          )}
        </div>

        {/* View-all — shown whenever there is a query (including zero results),
            so the full listing is always one click away. */}
        {trimmed && status !== "error" && (
          <button
            type="button"
            onClick={goToAllResults}
            className="w-full border-t border-gray-200 px-4 py-3 text-left text-sm font-medium text-brand-teal transition-colors hover:bg-gray-50"
          >
            View all results for “{trimmed}”
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
