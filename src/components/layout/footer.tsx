"use client";

import { useState } from "react";
import { CONTACT_EMAIL, LINKEDIN_URL, SITE_NAME } from "@/config/site.config";
import { apiRequest, ApiRequestError } from "@/lib/api";

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
  const currentYear = new Date().getFullYear();

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setNewsletterState("loading");
    try {
      await apiRequest("/v1/subscribers", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      setNewsletterState("sent");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        console.error(err.message);
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
          {/* verified / check-badge icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0 text-brand-mint"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.491 4.491 0 0 1-3.497-1.307 4.491 4.491 0 0 1-1.307-3.497A4.49 4.49 0 0 1 2.25 12a4.49 4.49 0 0 1 1.549-3.397 4.491 4.491 0 0 1 1.307-3.497 4.491 4.491 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
          </svg>
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
          {/* check-circle icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-brand-mint"
            aria-hidden="true"
          >
            <circle cx={12} cy={12} r={10} />
            <polyline points="9 12 11 14 15 10" />
          </svg>
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
              Something went wrong. Please try again.
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-mint"
                aria-hidden="true"
              >
                <rect x={2} y={4} width={20} height={16} rx={2} />
                <polyline points="2,4 12,13 22,4" />
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
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
