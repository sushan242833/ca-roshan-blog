"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public route error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-24">
      <div className="mx-auto w-full max-w-lg text-center">
        <h1 className="font-serif text-3xl font-bold text-brand-navy md:text-4xl">
          Something went wrong on our end
        </h1>
        <div className="mx-auto my-6 h-0.5 w-12 bg-brand-teal" />
        <p className="mx-auto max-w-md text-gray-600">
          This page could not be loaded right now. This is a problem on our
          side, not with the link you followed — it is usually temporary.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white"
          >
            Return home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-xs text-gray-400">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
