"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type TransitionEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PostCard from "@/components/posts/post-card";
import {
  FEATURED_CAROUSEL_INTERVAL_MS,
  FEATURED_CAROUSEL_TRANSITION_MS,
} from "@/lib/constants";
import type { PostSummaryResponse } from "@/types/post";

const VISIBLE_COUNT = 2;
// A gentle ease-in-out: starts and settles softly instead of the abrupt
// start of the default "ease".
const SLIDE_EASING = "cubic-bezier(0.45, 0, 0.2, 1)";
// The silent jump back from the clones normally runs on transitionend; this
// fallback covers a hidden tab, where the event never fires.
const SNAP_FALLBACK_MS = 150;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

// The server cannot know either preference; it renders the animated, visible
// state and the client corrects it on hydration.
const getServerFalse = () => false;
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getTabHidden = () => document.visibilityState === "hidden";

// The track holds every post followed by clones of the first VISIBLE_COUNT, so
// moving forward past the last post slides onto copies of the first ones. Once
// that slide finishes the track snaps, without animation, from the clones back
// to the identical originals — the loop never visibly runs backwards. Prev from
// the start does the mirror image: snap to the clones, then slide back one.
interface TrackState {
  index: number;
  animate: boolean;
  // An animated move to run once the preceding snap has been painted.
  pendingIndex: number | null;
  // Bumped on every deliberate move; the autoplay timer restarts on it, but not
  // on the silent snaps, so the loop keeps a steady rhythm.
  moveId: number;
}

type TrackAction =
  | { type: "next"; count: number; animated: boolean }
  | { type: "prev"; count: number; animated: boolean }
  | { type: "goTo"; index: number; animated: boolean }
  | { type: "snap"; count: number }
  | { type: "runPending" };

function trackReducer(state: TrackState, action: TrackAction): TrackState {
  const moveId = state.moveId + 1;

  switch (action.type) {
    case "next":
      if (!action.animated) {
        return { index: (state.index + 1) % action.count, animate: false, pendingIndex: null, moveId };
      }
      return state.index >= action.count
        ? { index: state.index - action.count, animate: false, pendingIndex: state.index - action.count + 1, moveId }
        : { index: state.index + 1, animate: true, pendingIndex: null, moveId };
    case "prev":
      if (!action.animated) {
        return { index: (state.index - 1 + action.count) % action.count, animate: false, pendingIndex: null, moveId };
      }
      return state.index <= 0
        ? { index: state.index + action.count, animate: false, pendingIndex: state.index + action.count - 1, moveId }
        : { index: state.index - 1, animate: true, pendingIndex: null, moveId };
    case "goTo":
      return { index: action.index, animate: action.animated, pendingIndex: null, moveId };
    case "snap":
      return state.index >= action.count
        ? { ...state, index: state.index - action.count, animate: false }
        : state;
    case "runPending":
      return state.pendingIndex === null
        ? state
        : { ...state, index: state.pendingIndex, animate: true, pendingIndex: null };
  }
}

const INITIAL_TRACK: TrackState = {
  index: 0,
  animate: true,
  pendingIndex: null,
  moveId: 0,
};

// Only keyboard focus pauses rotation. A mouse click also focuses the arrow it
// lands on, and that focus outlives the pointer leaving the carousel — pausing
// on it would leave the carousel stopped after every click.
function isKeyboardFocus(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

interface FeaturedCarouselProps {
  posts: PostSummaryResponse[];
}

export default function FeaturedCarousel({ posts }: FeaturedCarouselProps) {
  const count = posts.length;

  if (count <= VISIBLE_COUNT) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            variant="featured"
            priority={index === 0}
          />
        ))}
      </div>
    );
  }

  return <RotatingCarousel posts={posts} />;
}

function RotatingCarousel({ posts }: FeaturedCarouselProps) {
  const count = posts.length;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerFalse,
  );
  const tabHidden = useSyncExternalStore(
    subscribeVisibility,
    getTabHidden,
    getServerFalse,
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [track, dispatch] = useReducer(trackReducer, INITIAL_TRACK);
  const trackRef = useRef<HTMLDivElement>(null);

  const animated = !reducedMotion;
  const autoplay = animated && !hovered && !focused && !tabHidden;

  const next = useCallback(
    () => dispatch({ type: "next", count, animated }),
    [count, animated],
  );
  const prev = () => dispatch({ type: "prev", count, animated });

  useEffect(() => {
    if (!autoplay) return;
    const handle = setTimeout(next, FEATURED_CAROUSEL_INTERVAL_MS);
    return () => clearTimeout(handle);
  }, [autoplay, next, track.moveId]);

  // Landed on the clones: jump back to the matching originals once the slide
  // has finished, normally on transitionend (below). Snapping on a timer alone
  // could land a frame before the slide ends and show as a small jolt.
  useEffect(() => {
    if (track.index < count) return;
    const handle = setTimeout(
      () => dispatch({ type: "snap", count }),
      track.animate ? FEATURED_CAROUSEL_TRANSITION_MS + SNAP_FALLBACK_MS : 0,
    );
    return () => clearTimeout(handle);
  }, [track.index, track.animate, count]);

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && event.propertyName === "transform") {
      dispatch({ type: "snap", count });
    }
  }

  // Reading layout forces the browser to apply the un-animated snap before the
  // animated move is rendered, so the transition starts from the snapped spot.
  useLayoutEffect(() => {
    if (track.pendingIndex === null) return;
    void trackRef.current?.offsetWidth;
    dispatch({ type: "runPending" });
  }, [track.pendingIndex]);

  const slides = [...posts, ...posts.slice(0, VISIBLE_COUNT)];
  const activeIndex = track.index % count;

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (isKeyboardFocus(event.target)) setFocused(true);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }

  const arrowClass =
    "pointer-events-auto z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-brand-navy opacity-0 shadow-md transition hover:border-brand-teal group-hover/carousel:opacity-100 group-has-focus-visible/carousel:opacity-100 hover:text-brand-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal";

  return (
    <section
      className="group/carousel"
      aria-roledescription="carousel"
      aria-label="Featured Insights"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="relative">
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            data-testid="featured-carousel-track"
            aria-live={autoplay ? "off" : "polite"}
            onTransitionEnd={handleTransitionEnd}
            className="-mx-3 flex will-change-transform"
            style={{
              transform: `translate3d(-${(track.index * 100) / VISIBLE_COUNT}%, 0, 0)`,
              transition:
                track.animate && animated
                  ? `transform ${FEATURED_CAROUSEL_TRANSITION_MS}ms ${SLIDE_EASING}`
                  : "none",
            }}
          >
            {slides.map((post, slideIndex) => {
              const visible =
                slideIndex >= track.index &&
                slideIndex < track.index + VISIBLE_COUNT;
              const isClone = slideIndex >= count;
              return (
                <div
                  key={isClone ? `clone-${post.id}` : post.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${(slideIndex % count) + 1} of ${count}`}
                  aria-hidden={!visible}
                  inert={!visible}
                  className="flex shrink-0 basis-1/2 px-3 [&>*]:w-full"
                >
                  <PostCard
                    post={post}
                    variant="featured"
                    priority={slideIndex === 0}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Shown on hover or keyboard focus, like the dots. Each arrow sits in
            a box the size of one card's 16:9 image, so it is centred on the
            photos rather than the whole card. Outside the cards when the page
            margin has room, just inside them otherwise. */}
        <div className="pointer-events-none absolute left-0 top-0 flex aspect-video w-[calc(50%-12px)] items-center">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className={`${arrowClass} ml-4 min-[1360px]:-ml-14`}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="pointer-events-none absolute right-0 top-0 flex aspect-video w-[calc(50%-12px)] items-center justify-end">
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className={`${arrowClass} mr-4 min-[1360px]:-mr-14`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Shown on hover or keyboard focus, not the focus a mouse click leaves
          behind, which would keep them up after the pointer leaves. Faded
          rather than removed, so the section does not change height. */}
      <div className="mt-6 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover/carousel:opacity-100 group-has-focus-visible/carousel:opacity-100">
        {posts.map((post, index) => (
          <button
            key={post.id}
            type="button"
            onClick={() => dispatch({ type: "goTo", index, animated })}
            aria-label={`Show slide ${index + 1} of ${count}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
              index === activeIndex
                ? "w-6 bg-brand-teal"
                : "w-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
