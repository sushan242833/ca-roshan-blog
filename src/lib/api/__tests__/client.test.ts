import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiRequest,
  authenticatedApiRequest,
  ApiRequestError,
} from "@/lib/api/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("unwraps { success, data } envelopes", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, data: { id: "1", name: "Taxation" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiRequest<{ id: string; name: string }>(
      "/v1/categories/1",
    );

    expect(data).toEqual({ id: "1", name: "Taxation" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps error responses to ApiRequestError with status and code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            success: false,
            message: "Category not found.",
            error: { code: "NOT_FOUND" },
          },
          404,
        ),
      ),
    );

    const request = apiRequest("/v1/categories/missing");

    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await request.catch((err: ApiRequestError) => {
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.message).toBe("Category not found.");
    });
  });

  it("resolves 204 responses without reading a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(
      apiRequest("/v1/categories/1", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("throws ApiRequestError when the body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })),
    );

    await expect(apiRequest("/v1/posts")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 502,
    });
  });
});

describe("authenticatedApiRequest", () => {
  it("throws immediately on a null token without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      authenticatedApiRequest("/v1/posts", null),
    ).rejects.toMatchObject({ name: "ApiRequestError", status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the Authorization header", async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => jsonResponse({ success: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedApiRequest("/v1/posts", "token-1");

    const [, init = {}] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-1" });
  });
});
