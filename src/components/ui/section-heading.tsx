import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
}

// Teal accent bar + serif heading used for on-page section titles
// ("Featured Insights", "Recent Publications").
export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="w-1 self-stretch rounded-full bg-brand-teal" />
      <h2 className="font-serif text-2xl font-bold text-brand-navy">
        {children}
      </h2>
    </div>
  );
}
