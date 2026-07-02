"use client";

import { useState } from "react";
import { CONTACT_EMAIL, LINKEDIN_URL, SITE_NAME } from "@/config/site.config";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { MailIcon, CheckBadgeIcon, CheckCircleIcon, LinkedInIcon } from "@/components/icons";

type NewsletterState = "idle" | "loading" | "sent" | "confirmed" | "error";

interface FooterProps {
  initialNewsletterState?: "idle" | "confirmed";
}

export default function Footer({
  initialNewsletterState = "idle",
}: FooterProps) {
  const [newsletterState, setNewsletterState] = useState<NewsletterState>(
    initialNewsletterState,
  );
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const currentYear = new Date().getFullYear();

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setNewsletterState("loading");
    setErrorMessage("");
    try {
      await apiRequest("/v1/subscribers", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      setNewsletterState("sent");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      setNewsletterState("error");
    }
  }

  function renderNewsletterContent() {
    if (newsletterState === "confirmed") {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-4 rounded-lg border border-brand-box-border bg-brand-box-bg p-4"
        >
          <CheckBadgeIcon size={20} className="shrink-0 text-brand-mint" />
          <p className="text-sm leading-relaxed text-brand-mint-text">
            You are subscribed to The Advisory Brief. Thank you for joining.
          </p>
        </div>
      );
    }

    if (newsletterState === "sent") {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-4 rounded-lg border border-brand-box-border bg-brand-box-bg p-4"
        >
          <CheckCircleIcon size={20} className="shrink-0 text-brand-mint" />
          <p className="text-sm leading-relaxed text-brand-mint-text">
            Verification link sent to your inbox. Please check your email to
            confirm your subscription.
          </p>
        </div>
      );
    }

    const isLoading = newsletterState === "loading";
    const isError = newsletterState === "error";

    return (
      <div className="space-y-3">
        <form
          aria-label="Newsletter subscription"
          onSubmit={handleSubscribe}
          className="flex flex-col gap-2 md:flex-row md:gap-0"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-white/30 md:rounded-l-lg md:rounded-r-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-brand-teal-dark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal disabled:opacity-60 md:w-auto md:rounded-l-none md:rounded-r-lg"
          >
            {isLoading ? (
              "Subscribing…"
            ) : (
              <>
                <span className="md:hidden">Subscribe Now</span>
                <span className="hidden md:inline">Subscribe</span>
              </>
            )}
          </button>
        </form>

        {isError && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-4">
            <p className="text-sm text-red-300">
              {errorMessage || "Something went wrong. Please try again."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <footer className="w-full bg-brand-navy px-6 pt-12 pb-8 text-white md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Main two-column area */}
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          {/* Left column */}
          <div className="md:w-[55%] space-y-4">
            <h2 className="font-serif text-xl font-bold text-white">
              The Advisory Brief
            </h2>
            <p className="max-w-md text-brand-muted">
              Professional insights on Nepalese tax law, compliance, and
              strategic financial advisory delivered to your inbox.
            </p>
            {renderNewsletterContent()}
          </div>

          {/* Right column */}
          <div className="flex flex-col items-start gap-4 md:w-[45%] md:items-end">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
              Connect
            </p>
            {/* Mail */}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-2 text-white transition-colors hover:text-brand-mint"
            >
              <MailIcon size={18} className="text-brand-mint" />
              <span className="text-sm">{CONTACT_EMAIL}</span>
            </a>
            {/* LinkedIn */}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${SITE_NAME} on LinkedIn`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
            >
              <LinkedInIcon size={18} />
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-brand-muted md:text-left">
            © {currentYear} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
