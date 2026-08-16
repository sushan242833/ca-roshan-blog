"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface ReadingRail {
  /** Stable id; also the localStorage key suffix. */
  key: string;
  /** Button label, e.g. "Contents". */
  label: string;
  /** Width of the desktop rail column, e.g. "lg:w-68". */
  widthClassName: string;
  /** The rail itself, for the desktop column. */
  sidebar: ReactNode;
  /** Mobile counterpart, rendered above the body. Omit if there isn't one. */
  inline?: ReactNode;
}

interface ReadingLayoutProps {
  /** Outer wrapper, e.g. "mx-auto max-w-300". */
  containerClassName: string;
  /** Article column, e.g. "max-w-180". */
  bodyClassName: string;
  /** Space between the rails and the article, e.g. "lg:gap-10". */
  gapClassName: string;
  left?: ReadingRail;
  right?: ReadingRail;
  children: ReactNode;
}

const STORAGE_PREFIX = "blog:rail:";

// A flex row rather than a grid with column spans: a rail can be switched off at
// any time, and flex reflows the article into the freed width on its own, where
// spans would need recomputing for every on/off combination.
const railShell =
  "hidden shrink-0 self-start lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)]";

// localStorage as an external store. The `storage` event only fires in *other*
// tabs, so toggling keeps its own listener set to notify this one.
const listeners = new Set<() => void>();

function subscribeToPrefs(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readVisible(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) !== "0";
  } catch {
    // Storage blocked (private browsing, cookie settings) — default to shown.
    return true;
  }
}

// Remembered per browser, not per post: a reader who hides the chapter list
// wants it gone on the next chapter too. The server snapshot is always "shown",
// so the markup hydrates cleanly and a stored preference applies right after.
function useRailVisibility(key: string): [boolean, () => void] {
  const visible = useSyncExternalStore(
    subscribeToPrefs,
    () => readVisible(key),
    () => true,
  );

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + key,
        readVisible(key) ? "0" : "1",
      );
    } catch {
      // Preference simply won't survive the page, which is acceptable.
    }
    listeners.forEach((listener) => listener());
  }, [key]);

  return [visible, toggle];
}

function RailToggle({
  label,
  visible,
  onToggle,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
        visible
          ? "border-brand-teal-dark bg-[#f0f5f3] text-brand-teal-dark"
          : "border-brand-muted text-[#566475] hover:border-brand-teal-dark hover:text-brand-teal-dark"
      }`}
    >
      {visible ? (
        <Eye size={13} aria-hidden="true" />
      ) : (
        <EyeOff size={13} aria-hidden="true" />
      )}
      {label}
      <span className="sr-only">{visible ? " (shown)" : " (hidden)"}</span>
    </button>
  );
}

// The article body flanked by up to two optional rails, each of which the reader
// can switch off and back on. Takes the rails as nodes so the server components
// that use it keep rendering their own content; this only owns the layout, the
// toggles, and the stored preference.
export default function ReadingLayout({
  containerClassName,
  bodyClassName,
  gapClassName,
  left,
  right,
  children,
}: ReadingLayoutProps) {
  const [showLeft, toggleLeft] = useRailVisibility(left?.key ?? "left");
  const [showRight, toggleRight] = useRailVisibility(right?.key ?? "right");

  const leftRail = left && showLeft ? left : null;
  const rightRail = right && showRight ? right : null;

  // The article is capped well below its flex track, so where the slack falls
  // has to follow the rails that are actually showing: hug whichever side has
  // one, and centre on the page once both are switched off.
  const bodyAlign =
    leftRail && !rightRail
      ? "lg:ml-0 lg:mr-auto"
      : rightRail && !leftRail
        ? "lg:ml-auto lg:mr-0"
        : "lg:mx-auto";

  return (
    <div className={containerClassName}>
      <div className={`lg:flex lg:items-start ${gapClassName}`}>
        {leftRail && (
          <aside className={`${railShell} ${leftRail.widthClassName}`}>
            {leftRail.sidebar}
          </aside>
        )}

        <div
          className={`mx-auto w-full min-w-0 lg:flex-1 ${bodyAlign} ${bodyClassName}`}
        >
          {/* Inside the article column rather than above the whole row, so the
              controls stay beside the text they affect instead of stranded at
              the far edge of the container once both rails are off. */}
          {(left || right) && (
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
              {left && (
                <RailToggle
                  label={left.label}
                  visible={showLeft}
                  onToggle={toggleLeft}
                />
              )}
              {right && (
                <RailToggle
                  label={right.label}
                  visible={showRight}
                  onToggle={toggleRight}
                />
              )}
            </div>
          )}

          {leftRail?.inline && (
            <div className="lg:hidden">{leftRail.inline}</div>
          )}
          {rightRail?.inline && (
            <div className="lg:hidden">{rightRail.inline}</div>
          )}
          {children}
        </div>

        {rightRail && (
          <aside className={`${railShell} ${rightRail.widthClassName}`}>
            {rightRail.sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
