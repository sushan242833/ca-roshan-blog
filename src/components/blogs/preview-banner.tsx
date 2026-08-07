import { PREVIEW_TOKEN_EXPIRY_MINUTES } from "@/lib/constants";

// Sticky "this is a draft" bar, shared by the preview landing and preview
// chapter pages so the warning never disappears while paging through a draft.
// Dark rather than a full-bleed amber block: it stays unmistakable against the
// white article without competing with the content, and the amber dot carries
// the not-live signal.
export default function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#121c2a] px-6 py-3 text-center">
      <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
        />
        Preview mode
      </span>
      <span className="text-[13px] text-white/70">
        Draft preview — expires in {PREVIEW_TOKEN_EXPIRY_MINUTES} minutes.
      </span>
    </div>
  );
}
