import { SITE_NAME } from "@/config/site.config";
import { DocumentIcon } from "@/components/icons";

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
      <DocumentIcon size={40} strokeWidth={1.5} className="mb-2 text-gray-300" />
      <span className="text-xs font-medium tracking-wide text-gray-400">
        {SITE_NAME}
      </span>
    </div>
  );
}
