"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { SearchIcon } from "@/components/icons";

interface SearchBarProps {
  defaultValue: string;
  activeCategory: string;
}

export default function SearchBar({ defaultValue, activeCategory }: SearchBarProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (value.trim()) params.set("search", value.trim());
        if (activeCategory) params.set("category", activeCategory);
        const qs = params.toString();
        router.push(`/blog${qs ? `?${qs}` : ""}`);
      }, SEARCH_DEBOUNCE_MS);
    },
    [router, activeCategory],
  );

  return (
    <div className="relative">
      <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder="Search articles..."
        aria-label="Search articles"
        className="w-52 rounded-full border border-gray-300 py-2 pl-8 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
      />
    </div>
  );
}
