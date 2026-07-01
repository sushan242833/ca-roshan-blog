import { SITE_NAME } from "@/config/site.config";

interface PostImagePlaceholderProps {
  className?: string;
}

export default function PostImagePlaceholder({
  className = "",
}: PostImagePlaceholderProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        bg-gradient-to-br from-gray-100 to-gray-200
        text-gray-400 select-none
        ${className}
      `}
      aria-hidden="true"
    >
      {/* Document / article icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-2 text-gray-300"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <span className="text-xs font-medium tracking-wide text-gray-400">
        {SITE_NAME}
      </span>
    </div>
  );
}
