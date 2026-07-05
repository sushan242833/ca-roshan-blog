import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePublicContent } from "@/lib/revalidate";

beforeEach(() => {
  // Failures are logged on purpose — keep test output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("revalidatePublicContent", () => {
  it("posts the scope with a bearer token to /api/revalidate", async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await revalidatePublicContent("posts", "token-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init = {}] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/revalidate");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer token-1",
    });
    expect(init.body).toBe(JSON.stringify({ scope: "posts" }));
  });

  it("omits the Authorization header when the token is null", async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await revalidatePublicContent("categories", null);

    const [, init = {}] = fetchMock.mock.calls[0];
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("swallows network errors instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      revalidatePublicContent("tags", "token-1"),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("does not throw on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(
      revalidatePublicContent("about", "token-1"),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
