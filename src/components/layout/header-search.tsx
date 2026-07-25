"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PostCard from "@/components/posts/post-card";
import { SearchIcon, XIcon } from "@/components/icons";
import { apiRequest } from "@/lib/api";
import { MIN_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import type { PaginatedResponse, PostSummaryResponse } from "@/types/post";

// "done" covers both "results ready" and "zero results" — the results array
// distinguishes them. A small preview count keeps the dropdown instant; the
// full, paginated experience is the existing /blog?search= page.
type Status = "loading" | "error" | "done";
const RESULT_LIMIT = 5;

// Module-level preview cache: retyping a previously searched term commits
// synchronously and fires no request. Keyed on the trimmed, lowercased term;
// capped and evicted oldest-first (Map preserves insertion order). Successful
// responses only — errors are never cached.
const CACHE_LIMIT = 50;
const previewCache = new Map<string, PostSummaryResponse[]>();

function cacheKey(term: string): string {
  return term.trim().toLowerCase();
}

function getCached(term: string): PostSummaryResponse[] | undefined {
  return previewCache.get(cacheKey(term));
}

function setCached(term: string, items: PostSummaryResponse[]): void {
  const key = cacheKey(term);
  previewCache.delete(key);
  previewCache.set(key, items);
  while (previewCache.size > CACHE_LIMIT) {
    const oldest = previewCache.keys().next().value;
    if (oldest === undefined) break;
    previewCache.delete(oldest);
  }
}

// Inline navbar search: the icon toggles an input that expands in place, and
// results render in a dropdown anchored under the field — no modal overlay.
export default function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PostSummaryResponse[]>([]);
  const [status, setStatus] = useState<Status>("done");
  // -1 = no active option; 0..results.length-1 = a result; results.length = the
  // "View all results" control (the final item in the arrow-key cycle).
  const [activeIndex, setActiveIndex] = useState(-1);
  // Guards against out-of-order responses: only the latest request may commit.
  const requestIdRef = useRef(0);
  // The in-flight request's controller, so a superseded/closed search is aborted
  // and never reaches the server (saving rate-limit budget).
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const trimmed = query.trim();
  const isTooShort = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH;
  const dropdownOpen = open && trimmed.length > 0;
  // Options exist whenever we're past the min length and not in an error state.
  const hasOptions = trimmed.length >= MIN_SEARCH_LENGTH && status !== "error";
  const optionCount = hasOptions ? results.length : 0;

  // Announced to screen readers once a search settles.
  const announcement =
    !hasOptions || status === "loading"
      ? ""
      : results.length === 0
        ? "No results"
        : `${results.length} result${results.length === 1 ? "" : "s"}`;

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setStatus("done");
    setActiveIndex(-1);
    requestIdRef.current += 1; // discard any in-flight response
    abortRef.current?.abort(); // and stop it hitting the server
  }

  // Focus the field as soon as it expands.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click while open. (Escape/arrows/Enter are handled on the
  // input's onKeyDown so they compose with the combobox interaction model.)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Abort any in-flight request on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Typing drives the visible state synchronously (event handler, not an
  // effect). A cache hit commits instantly with no spinner; below the minimum
  // length no request is prepared and a neutral hint is shown.
  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    const nextTrimmed = value.trim();

    if (nextTrimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setStatus("done");
      return;
    }

    const cached = getCached(nextTrimmed);
    if (cached) {
      setResults(cached);
      setStatus("done");
    } else {
      setStatus("loading");
    }
  }

  // Debounced fetch. Skips entirely on a cache hit or below the minimum length.
  // A per-request AbortController is aborted by this effect's cleanup whenever
  // the term changes (superseding the previous request) or the component
  // unmounts.
  useEffect(() => {
    if (trimmed.length < MIN_SEARCH_LENGTH) return;
    // A cache hit was already committed synchronously in handleQueryChange (the
    // only path that changes the term) — just skip the network request.
    if (getCached(trimmed)) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      apiRequest<PaginatedResponse<PostSummaryResponse>>(
        `/v1/posts?search=${encodeURIComponent(trimmed)}&limit=${RESULT_LIMIT}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          setCached(trimmed, data.items);
          setResults(data.items);
          setStatus("done");
        })
        .catch((error: unknown) => {
          // A cancelled request is expected, not an error — never flip the UI.
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setStatus("error");
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Keep the active option scrolled into view as the user arrows through.
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
    // optionId is stable for a given render; baseId is constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Enter (no active option) and the "View all" control share this: reuse the
  // existing full listing page rather than a second results page.
  function goToAllResults() {
    if (!trimmed) return;
    router.push(`/blog?search=${encodeURIComponent(trimmed)}`);
    close();
  }

  function openPost(post: PostSummaryResponse) {
    router.push(`/blog/${post.slug}`);
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      if (optionCount === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % optionCount));
      return;
    }

    if (event.key === "ArrowUp") {
      if (optionCount === 0) return;
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        openPost(results[activeIndex]);
      } else {
        // The "View all" option or no active option → full results page.
        goToAllResults();
      }
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {open ? (
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            goToAllResults();
          }}
          className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal"
        >
          <SearchIcon size={16} className="shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search articles..."
            aria-label="Search articles"
            className="w-40 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none sm:w-56"
          />
          {status === "loading" && (
            <Loader2 size={14} className="shrink-0 animate-spin text-gray-400" />
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="shrink-0 text-gray-400 transition-colors hover:text-brand-navy"
          >
            <XIcon size={16} />
          </button>
        </form>
      ) : (
        <button
          aria-label="Search"
          onClick={() => setOpen(true)}
          className="text-gray-500 hover:text-brand-teal"
        >
          <SearchIcon size={20} />
        </button>
      )}

      {/* Visually hidden live region announcing the result count. */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {/* Results dropdown — anchored under the field, right-aligned so it never
          overflows the viewport edge. */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,24rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {isTooShort ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              Type at least {MIN_SEARCH_LENGTH} characters
            </p>
          ) : status === "error" ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              Something went wrong while searching. Please try again.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && status === "loading" && (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
              {results.length === 0 && status === "done" && (
                <p className="px-3 py-6 text-center text-sm text-gray-500">
                  No articles found for “{trimmed}”.
                </p>
              )}

              <ul
                id={listboxId}
                role="listbox"
                aria-label="Search results"
                className="flex flex-col gap-0.5"
              >
                {results.map((post, index) => (
                  <li
                    key={post.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={
                      activeIndex === index ? "rounded-md bg-gray-100" : undefined
                    }
                  >
                    <PostCard post={post} variant="compact" onClick={close} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
