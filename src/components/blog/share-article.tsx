"use client";

import { toast } from "sonner";
import {
  FacebookIcon,
  TwitterXIcon,
  LinkedInIcon,
  LinkIcon,
  MailIcon,
} from "@/components/icons";

interface ShareArticleProps {
  title: string;
  url: string;
}

const iconBtn =
  "flex h-12 w-12 items-center justify-center rounded-full border border-[#6f7975] text-[#121c2a] transition-colors hover:border-[#005243] hover:text-[#005243]";

export default function ShareArticle({ title, url }: ShareArticleProps) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  const twitterHref = `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
  const mailHref = `mailto:?subject=${encodedTitle}&body=${encoded}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <div className="mt-16 flex flex-col items-center gap-6 border-t border-[#bec9c4] pt-16 text-center">
      <p className="text-[14px] font-semibold uppercase leading-none tracking-normal text-[#3f4945]">
        Share this insight
      </p>
      <div className="flex items-center justify-center gap-4">
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
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy link"
          className={iconBtn}
        >
          <LinkIcon />
        </button>
        <a href={mailHref} aria-label="Share by email" className={iconBtn}>
          <MailIcon size={18} />
        </a>
      </div>
    </div>
  );
}
