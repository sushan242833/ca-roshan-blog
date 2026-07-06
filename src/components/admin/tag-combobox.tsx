"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { TagResponse } from "@/types/tag";

interface TagComboboxProps {
  tags: TagResponse[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  /** Create a brand-new tag from the typed text (parent handles the API). */
  onCreate: (name: string) => Promise<void>;
  isCreating: boolean;
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

// Typeahead for selecting existing tags and creating new ones inline, without
// leaving the editor. Filtering is a client-side, case-insensitive substring
// match over the already-fetched tag list.
export default function TagCombobox({
  tags,
  selectedTagIds,
  onToggle,
  onCreate,
  isCreating,
}: TagComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = useMemo(
    () =>
      selectedTagIds
        .map((id) => tags.find((tag) => tag.id === id))
        .filter((tag): tag is TagResponse => Boolean(tag)),
    [selectedTagIds, tags],
  );

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    return tags
      .filter((tag) => tag.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [tags, trimmed]);

  // Offer creation only when the typed text does not already name a tag.
  const exactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = trimmed.length > 0 && !exactMatch;

  async function handleCreate() {
    if (!canCreate || isCreating) return;
    await onCreate(trimmed);
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className="mt-3">
      {selectedTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teal"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => onToggle(tag.id)}
                aria-label={`Remove tag ${tag.name}`}
                className="text-brand-teal transition-colors hover:text-brand-teal-dark"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Delay close so a click on an option registers before blur.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (canCreate) void handleCreate();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search or create a tag…"
          aria-label="Search or create a tag"
          className={inputClass}
        />

        {open && (filtered.length > 0 || canCreate) && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {filtered.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onToggle(tag.id)}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span
                      className={
                        selected ? "font-medium text-brand-teal" : "text-gray-700"
                      }
                    >
                      {tag.name}
                    </span>
                    {selected && (
                      <span className="text-xs text-brand-teal">Selected</span>
                    )}
                  </button>
                </li>
              );
            })}
            {canCreate && (
              <li>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-brand-teal hover:bg-brand-teal/5 disabled:opacity-60"
                >
                  {isCreating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Create tag: “{trimmed}”
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
