import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Icon size in px (lucide `size`). Defaults to 16. */
  size?: number;
  /** Screen-reader-only label. When omitted, the icon is hidden from AT. */
  label?: string;
  /** Extra classes (e.g. colour). `animate-spin` is always applied. */
  className?: string;
}

// Single source of truth for the app's loading spinner. Renders the same
// lucide Loader2 that was previously inlined across the codebase; colour is
// inherited from the surrounding text unless overridden via className.
export default function Spinner({ size = 16, label, className }: SpinnerProps) {
  return (
    <>
      <Loader2
        size={size}
        aria-hidden="true"
        className={cn("animate-spin", className)}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}
