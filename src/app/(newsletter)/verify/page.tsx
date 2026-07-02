"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Footer from "@/components/layout/footer";
import { apiRequest, ApiRequestError } from "@/lib/api";
import { CheckCircleIcon, AlertTriangleIcon } from "@/components/icons";

type PageState = "loading" | "success" | "expired" | "invalid";
type ResendState = "idle" | "sending" | "sent" | "error";

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-teal" />
      <p className="text-sm text-gray-500">Verifying your subscription…</p>
    </div>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [serverMessage, setServerMessage] = useState<string>("");

  const [resendEmail, setResendEmail] = useState("");
  const [resendEmailError, setResendEmailError] = useState("");
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendServerError, setResendServerError] = useState("");

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      setServerMessage("No verification token was found in the link.");
      return;
    }

    apiRequest(`/v1/subscribers/verify/${encodeURIComponent(token)}`)
      .then(() => setPageState("success"))
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError) {
          setServerMessage(err.message);
          // 410 = token expired (GoneError from backend)
          setPageState(err.status === 410 ? "expired" : "invalid");
        } else {
          setServerMessage("Something went wrong. Please try again.");
          setPageState("invalid");
        }
      });
  }, [token]);

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResendEmailError("");
    setResendServerError("");

    const trimmed = resendEmail.trim();
    if (!trimmed) {
      setResendEmailError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResendEmailError("Please enter a valid email address.");
      return;
    }

    setResendState("sending");
    try {
      await apiRequest("/v1/subscribers", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      setResendState("sent");
    } catch (err) {
      setResendState("error");
      if (err instanceof ApiRequestError) {
        // 409 = already subscribed / pending — resend still makes sense to treat as sent
        if (err.status === 409) {
          setResendState("sent");
        } else {
          setResendServerError(err.message || "Failed to send. Please try again.");
        }
      } else {
        setResendServerError("Something went wrong. Please try again.");
      }
    }
  }

  if (pageState === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <>
        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/10">
              <CheckCircleIcon size={32} className="text-brand-teal" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              Subscription Confirmed
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              Thank you for verifying your email address. You are now officially
              subscribed to the CA Roshan newsletter. Expect expert insights and
              financial updates delivered straight to your inbox.
            </p>
            <Link
              href="/blog"
              className="mt-7 inline-block rounded-md bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark"
            >
              Browse Latest Articles
            </Link>
          </div>
        </div>
        <Footer initialNewsletterState="confirmed" />
      </>
    );
  }

  if (pageState === "expired") {
    return (
      <>
        <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <AlertTriangleIcon size={28} className="text-orange-400" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-navy">
              Link Expired
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              {serverMessage || "This verification link has expired. Links are valid for 24 hours. Enter your email below to receive a new one."}
            </p>

            <div className="mt-7 text-left">
              {resendState === "sent" ? (
                <div className="rounded-md border border-brand-teal/30 bg-brand-teal/5 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-brand-teal">
                    Verification email sent! Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResend} noValidate className="space-y-3">
                  <div>
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => {
                        setResendEmail(e.target.value);
                        if (resendEmailError) setResendEmailError("");
                      }}
                      placeholder="Enter your email address"
                      className={[
                        "w-full rounded-md border px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1",
                        resendEmailError
                          ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                          : "border-gray-300 focus:border-brand-teal focus:ring-brand-teal",
                      ].join(" ")}
                    />
                    {resendEmailError && (
                      <p className="mt-1 text-xs text-red-500">{resendEmailError}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={resendState === "sending"}
                    className="w-full rounded-md bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark disabled:opacity-60"
                  >
                    {resendState === "sending" ? "Sending…" : "Resend Verification"}
                  </button>
                  {resendServerError && (
                    <p className="text-center text-xs text-red-500">{resendServerError}</p>
                  )}
                </form>
              )}
            </div>

            <Link
              href="/"
              className="mt-5 inline-block text-sm text-gray-500 transition-colors hover:text-brand-navy"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // invalid state (404, missing token, or unknown error)
  return (
    <>
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <AlertTriangleIcon size={28} className="text-orange-400" strokeWidth={2} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-navy">
            Link Invalid or Already Used
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
            {serverMessage || "This verification link is invalid or has already been used. If you haven't confirmed your subscription yet, please subscribe again."}
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="rounded-md bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-dark"
            >
              Return to Home
            </Link>
            <Link
              href="/blog"
              className="text-sm text-gray-500 transition-colors hover:text-brand-navy"
            >
              Browse Latest Articles
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Spinner />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
