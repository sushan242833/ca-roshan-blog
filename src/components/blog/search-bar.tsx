"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      >
        <circle cx={11} cy={11} r={8} />
        <line x1={21} y1={21} x2={16.65} y2={16.65} />
      </svg>
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
