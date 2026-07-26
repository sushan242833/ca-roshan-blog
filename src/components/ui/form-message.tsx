import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormMessageType = "error" | "success" | "info";

const TYPE_CLASS: Record<FormMessageType, string> = {
  error: "border-red-300 bg-red-50 text-red-600",
  success: "border-brand-teal/30 bg-brand-teal/5 text-brand-teal",
  info: "border-gray-300 bg-gray-50 text-gray-600",
};

interface FormMessageProps {
  type: FormMessageType;
  message: ReactNode;
  /** Extra layout classes (margins, or `p-3` to override the default `p-4`). */
  className?: string;
}

// Shared inline form status box (error/success/info). Padding defaults to p-4;
// pass className to adjust spacing or margins for a specific placement.
export default function FormMessage({ type, message, className }: FormMessageProps) {
  return (
    <div className={cn("rounded-md border p-4 text-sm", TYPE_CLASS[type], className)}>
      {message}
    </div>
  );
}
