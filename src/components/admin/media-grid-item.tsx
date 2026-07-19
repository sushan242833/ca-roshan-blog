"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { FileText, ImageOff } from "lucide-react";
import type { MediaResponse } from "@/types/media";

interface MediaGridItemProps {
  media: MediaResponse;
  /** Renders the whole card as a select button (media picker dialog). */
  onClick?: () => void;
  /** Extra line under the name, e.g. size · date (Media Library). */
  meta?: ReactNode;
  /** Hover actions overlaid on the thumbnail (Media Library). */
  actions?: ReactNode;
}

// Media card shared by the picker dialog and the Media Library grid:
// thumbnail with a neutral fallback when the image fails to load, plus a
// truncated original file name.
export default function MediaGridItem({
  media,
  onClick,
  meta,
  actions,
}: MediaGridItemProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isDocument = media.kind === "document";

  const body = (
    <>
      <div className="relative aspect-square w-full bg-gray-100">
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
        {meta && <p className="mt-0.5 truncate text-xs text-gray-400">{meta}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group overflow-hidden rounded-md border border-gray-200 bg-white text-left transition-colors hover:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="group overflow-hidden rounded-md border border-gray-200 bg-white">
      {body}
    </div>
  );
}
