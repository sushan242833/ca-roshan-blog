import { useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthProvider, {
  useAuth,
} from "@/components/providers/auth-provider";
import { useAuthStore } from "@/store/auth-store";
import { ApiRequestError } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Opaque (non-JWT) tokens so the provider's proactive-refresh timer never
// arms — these tests exercise the 401-retry path only.
const TOKEN_1 = "token-1";
const TOKEN_2 = "token-2";

const ADMIN_PROFILE = { id: "admin-1", email: "admin@example.test" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function success(data: unknown): Response {
  return jsonResponse({ success: true, data });
}

function unauthorized(): Response {
  return jsonResponse(
    { success: false, message: "Unauthorized.", error: { code: "UNAUTHORIZED" } },
    401,
  );
}

type RouteHandler = (init: RequestInit | undefined) => Response;

interface FetchHarness {
  fetchMock: ReturnType<typeof vi.fn>;
  routes: Map<string, RouteHandler>;
  callsTo: (path: string) => Array<RequestInit | undefined>;
}

// Path-keyed fetch stub. Routes can be swapped mid-test (e.g. after the
// provider has mounted) and per-path calls inspected for exact counts.
function stubFetch(): FetchHarness {
  const routes = new Map<string, RouteHandler>();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const handler = routes.get(path);
    if (!handler) {
      throw new Error(`Unexpected fetch to "${path}" in test.`);
    }
    return handler(init);
  });
  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    routes,
    callsTo: (path: string) =>
      fetchMock.mock.calls
        .filter(([input]) => String(input) === path)
        .map(([, init]) => init as RequestInit | undefined),
  };
}

function authHeaderOf(init: RequestInit | undefined): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

let capturedAuth: ReturnType<typeof useAuth>;

function CaptureAuth() {
  const auth = useAuth();
  // Assignment must happen outside render (react-hooks/globals); the tests
  // only use capturedAuth after waiting for the rendered state below.
  useEffect(() => {
    capturedAuth = auth;
  });
  return (
    <span data-testid="auth-state">
      {auth.isLoading ? "loading" : auth.admin ? "authed" : "anon"}
    </span>
  );
}

// Mounts the provider with a working refresh + profile route and waits for
// the session restore to settle with TOKEN_1.
async function mountAuthedProvider(harness: FetchHarness): Promise<void> {
  harness.routes.set("/v1/auth/refresh", () => success({ accessToken: TOKEN_1 }));
  harness.routes.set("/v1/auth/me", () => success(ADMIN_PROFILE));

  render(
    <AuthProvider>
      <CaptureAuth />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("auth-state")).toHaveTextContent("authed"),
  );
}

// The Zustand store is a module singleton, so state leaks across tests unless
// reset — restore the initial auth state before each test for isolation.
beforeEach(() => {
  useAuthStore.setState({ admin: null, accessToken: null, isLoading: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authedFetch 401 refresh behavior", () => {
  it("re-establishes the session presence cookie on a successful refresh", async () => {
    // Simulate a browser whose presence cookie expired while the httpOnly
    // refresh cookie is still valid — proxy.ts gates /admin on this cookie,
    // so a restored session must set it back or /login redirect-loops.
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
    const harness = stubFetch();

    await mountAuthedProvider(harness);

    expect(document.cookie).toContain(`${SESSION_COOKIE_NAME}=1`);
  });

  it("refreshes once on a 401 and retries the request with the new token", async () => {
    const harness = stubFetch();
    await mountAuthedProvider(harness);
    const refreshCallsAfterMount = harness.callsTo("/v1/auth/refresh").length;

    harness.routes.set("/v1/auth/refresh", () =>
      success({ accessToken: TOKEN_2 }),
    );
    harness.routes.set("/v1/posts/admin", (init) =>
      authHeaderOf(init) === `Bearer ${TOKEN_2}`
        ? success({ items: ["fresh"] })
        : unauthorized(),
    );

    let result: unknown;
    await act(async () => {
      result = await capturedAuth.authedFetch("/v1/posts/admin");
    });

    expect(result).toEqual({ items: ["fresh"] });
    expect(harness.callsTo("/v1/auth/refresh").length).toBe(
      refreshCallsAfterMount + 1,
    );
    const requestCalls = harness.callsTo("/v1/posts/admin");
    expect(requestCalls.length).toBe(2);
    expect(authHeaderOf(requestCalls[0])).toBe(`Bearer ${TOKEN_1}`);
    expect(authHeaderOf(requestCalls[1])).toBe(`Bearer ${TOKEN_2}`);
  });

  it("shares a single refresh between two concurrent 401s", async () => {
    const harness = stubFetch();
    await mountAuthedProvider(harness);
    const refreshCallsAfterMount = harness.callsTo("/v1/auth/refresh").length;

    harness.routes.set("/v1/auth/refresh", () =>
      success({ accessToken: TOKEN_2 }),
    );
    const protectedRoute: RouteHandler = (init) =>
      authHeaderOf(init) === `Bearer ${TOKEN_2}`
        ? success({ ok: true })
        : unauthorized();
    harness.routes.set("/v1/first", protectedRoute);
    harness.routes.set("/v1/second", protectedRoute);

    let results: unknown[] = [];
    await act(async () => {
      results = await Promise.all([
        capturedAuth.authedFetch("/v1/first"),
        capturedAuth.authedFetch("/v1/second"),
      ]);
    });

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    // Single-flight: both 401s must share ONE refresh call.
    expect(harness.callsTo("/v1/auth/refresh").length).toBe(
      refreshCallsAfterMount + 1,
    );
    expect(harness.callsTo("/v1/first").length).toBe(2);
    expect(harness.callsTo("/v1/second").length).toBe(2);
  });

  it("clears auth state and propagates the error when refresh fails, without retrying", async () => {
    const harness = stubFetch();
    await mountAuthedProvider(harness);
    const refreshCallsAfterMount = harness.callsTo("/v1/auth/refresh").length;

    harness.routes.set("/v1/auth/refresh", () => unauthorized());
    harness.routes.set("/v1/posts/admin", () => unauthorized());

    let thrown: unknown;
    await act(async () => {
      thrown = await capturedAuth.authedFetch("/v1/posts/admin").catch((err) => err);
    });

    expect(thrown).toBeInstanceOf(ApiRequestError);
    expect((thrown as ApiRequestError).status).toBe(401);
    // No retry loop: the original request ran once, refresh ran once.
    expect(harness.callsTo("/v1/posts/admin").length).toBe(1);
    expect(harness.callsTo("/v1/auth/refresh").length).toBe(
      refreshCallsAfterMount + 1,
    );
    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent("anon"),
    );
  });
});
