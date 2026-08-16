"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { FileText, ImageOff, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaResponse } from "@/types/media";

interface MediaGridItemProps {
  media: MediaResponse;
  onClick?: () => void;
  meta?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  selectionLabel?: string;
  selectionDisabled?: boolean;
  showUsageBadge?: boolean;
}

export default function MediaGridItem({
  media,
  onClick,
  meta,
  actions,
  selected = false,
  onSelectionChange,
  selectionLabel,
  selectionDisabled = false,
  showUsageBadge = false,
}: MediaGridItemProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isDocument = media.kind === "document";
  const showInUse = showUsageBadge && media.inUse;

  const body = (
    <>
      <div className="relative aspect-square w-full bg-gray-100">
        {onSelectionChange && (
          <label
            onClick={(event) => event.stopPropagation()}
            className="absolute left-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-md bg-white/95 shadow ring-1 ring-gray-200 transition-colors hover:bg-white"
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={selectionDisabled}
              onChange={(event) => onSelectionChange(event.target.checked)}
              aria-label={selectionLabel ?? `Select ${media.originalName}`}
              className="size-4 accent-brand-teal-dark"
            />
          </label>
        )}
        {isDocument ? (
          // Documents (PDFs) have no thumbnail — show an icon + extension so
          // the card reads as a file rather than a broken image.
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
            <FileText size={28} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              PDF
            </span>
          </div>
        ) : imageFailed ? (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageOff size={24} />
          </div>
        ) : (
          <Image
            src={media.url}
            alt={media.originalName}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
        {showInUse && (
          <span
            title="Used by a post — this file is protected from deletion."
            className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-brand-teal-dark/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
          >
            <Link2 size={11} />
            In use
          </span>
        )}
        {actions && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-brand-navy/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {actions}
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 px-2 py-1.5">
        <p className="truncate text-xs font-medium text-gray-600 group-hover:text-brand-navy">
          {media.originalName}
        </p>
        {meta && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{meta}</p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group overflow-hidden rounded-md border bg-white text-left transition-colors hover:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal",
          selected
            ? "border-brand-teal ring-2 ring-brand-teal/30"
            : "border-gray-200",
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-md border bg-white transition-colors",
        selected
          ? "border-brand-teal ring-2 ring-brand-teal/30"
          : "border-gray-200",
      )}
    >
      {body}
    </div>
  );
}
