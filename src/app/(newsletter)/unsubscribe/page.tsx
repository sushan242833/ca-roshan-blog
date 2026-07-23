"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/layout/footer";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { CheckCircleIcon, AlertTriangleIcon } from "@/components/icons";

type PageState =
  | "checking"
  | "confirm"
  | "processing"
  | "success"
  | "already"
  | "invalid";

interface SubscriberStatusResponse {
  status?: string;
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-teal" />
      <p className="text-sm text-gray-500">Processing…</p>
    </div>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>(
    token ? "checking" : "invalid",
  );
  const [serverMessage, setServerMessage] = useState<string>(
    token ? "" : "No unsubscribe token was found in the link.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    apiRequest<SubscriberStatusResponse>(
      `/v1/subscribers/unsubscribe/${encodeURIComponent(token)}`,
    )
      .then((response) => {
        if (!active) {
          return;
        }
        if (response?.status === "UNSUBSCRIBED") {
          setPageState("already");
        } else {
          setPageState("confirm");
        }
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }
        if (err instanceof ApiRequestError) {
          setServerMessage(err.message);
        } else {
          setServerMessage("Something went wrong. Please try again.");
        }
        setPageState("invalid");
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleUnsubscribe = () => {
    if (!token) {
      return;
    }

    setPageState("processing");
    apiRequest(`/v1/subscribers/unsubscribe/${encodeURIComponent(token)}`, {
      method: "POST",
    })
      .then(() => setPageState("success"))
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setServerMessage(err.message);
        } else {
          setServerMessage("Something went wrong. Please try again.");
        }
        setPageState("invalid");
      });
  };

  if (pageState === "checking" || pageState === "processing") {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (pageState === "confirm") {
    return (
      <>
        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <AlertTriangleIcon size={28} className="text-orange-400" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              Unsubscribe from our newsletter?
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              You&apos;ll stop receiving new post updates and advisory insights
              from Roshan Blog. You can re-subscribe at any time.
            </p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              className="mt-7 inline-flex w-full items-center justify-center rounded-md bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy"
            >
              Yes, unsubscribe me
            </button>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-gray-500 transition-colors hover:text-brand-navy"
              >
                No, keep me subscribed
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (pageState === "success") {
    return (
      <>
        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
            {/* Muted grey — understated, not celebratory */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <CheckCircleIcon size={32} className="text-gray-500" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              You Have Been Unsubscribed
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              We&apos;ve safely removed your email address from our mailing list.
              You will no longer receive our newsletter updates.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white"
            >
              <span aria-hidden="true">↩</span> Re-subscribe
            </Link>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-gray-500 transition-colors hover:text-brand-navy"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (pageState === "already") {
    return (
      <>
        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <CheckCircleIcon size={32} className="text-gray-500" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              You&apos;re Already Unsubscribed
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              This email address is no longer on our mailing list, so there&apos;s
              nothing more to do. You can re-subscribe at any time.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white"
            >
              <span aria-hidden="true">↩</span> Re-subscribe
            </Link>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-gray-500 transition-colors hover:text-brand-navy"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // invalid state — token missing, not found, or already used
  return (
    <>
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <AlertTriangleIcon size={28} className="text-orange-400" strokeWidth={2} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-navy">
            This Link Is No Longer Valid
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
            {serverMessage || "This unsubscribe link is invalid or has already been used. If you still wish to unsubscribe, please contact us directly."}
          </p>
          <div className="mt-7">
            <Link
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-brand-navy"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Spinner />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
