"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/config/site.config";

// Render's free tier spins a service down after ~15 minutes idle, and waking it
// costs the unlucky first visitor several seconds. A cron ping keeps it warm most
// of the time; this covers the case where a real visitor arrives first anyway.
//
// The public pages are ISR-cached, so a page view often serves entirely from the
// Vercel cache without ever calling the backend — meaning the cold start is not
// paid until the visitor navigates somewhere that needs fresh data. Firing this
// on mount starts the wake-up in parallel with rendering instead.
//
// Deliberately invisible: no state, no error surface, renders nothing. Anything
// that goes wrong here must not reach the user.

// One ping per page load. Client-side navigation remounts this component, and
// re-pinging on every route change would just be noise.
let pinged = false;

// The root /health route, not /api/v1/health: the root one sits outside the API
// rate limiter (see backend app.ts). API_BASE_URL ends in /api, so take its
// origin and append /health.
function healthUrl(): string | null {
  if (!API_BASE_URL) {
    // Development same-origin fallback — there is no separate backend to warm.
    return null;
  }

  try {
    return `${new URL(API_BASE_URL).origin}/health`;
  } catch {
    return null;
  }
}

export default function WarmBackend() {
  useEffect(() => {
    if (pinged) {
      return;
    }
    pinged = true;

    const url = healthUrl();
    if (!url) {
      return;
    }

    void fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      keepalive: true,
    }).catch(() => {
      // Silent by design — a failed warm-up must never surface to the reader.
    });
  }, []);

  return null;
}
