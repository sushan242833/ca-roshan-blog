"use client";

import { toast } from "sonner";
import { FacebookIcon, TwitterXIcon, LinkedInIcon, ShareIcon, LinkIcon } from "@/components/icons";

interface ShareArticleProps {
  title: string;
  url: string;
}

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand-teal hover:text-brand-teal";

export default function ShareArticle({ title, url }: ShareArticleProps) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  const twitterHref = `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled or not supported
      }
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Share this article
      </p>
      <div className="flex items-center gap-2">
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          className={iconBtn}
        >
          <FacebookIcon size={16} />
        </a>
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
          className={iconBtn}
        >
          <TwitterXIcon size={15} />
        </a>
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className={iconBtn}
        >
          <LinkedInIcon size={16} />
        </a>
        <button onClick={handleShare} aria-label="Share article" className={iconBtn}>
          <ShareIcon />
        </button>
        <button onClick={handleCopy} aria-label="Copy link" className={iconBtn}>
          <LinkIcon />
        </button>
      </div>
    </div>
  );
}
