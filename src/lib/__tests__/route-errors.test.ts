import { describe, expect, it, vi } from "vitest";

const notFoundMock = vi.fn(() => {
  // next/navigation's notFound() throws a control-flow error; mirror that so
  // callers cannot fall through it.
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const { notFoundOrRethrow, isUpstreamFailure } = await import(
  "@/lib/route-errors"
);
const { ApiRequestError } = await import("@/lib/api");

describe("notFoundOrRethrow", () => {
  it("renders a 404 page only for a genuine 404 from the API", () => {
    notFoundMock.mockClear();

    expect(() =>
      notFoundOrRethrow(new ApiRequestError("Post not found.", 404)),
    ).toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("rethrows a 500 so the error boundary shows a server error", () => {
    // The regression: every failure became notFound(), so a backend outage told
    // readers the article did not exist and served search engines a 404 for a
    // live URL.
    notFoundMock.mockClear();
    const error = new ApiRequestError("Database unavailable", 503);

    expect(() => notFoundOrRethrow(error)).toThrow(error);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("rethrows a network failure rather than calling it a missing page", () => {
    notFoundMock.mockClear();
    const error = new TypeError("fetch failed");

    expect(() => notFoundOrRethrow(error)).toThrow(error);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("rethrows a 400 — a bad request is not a missing page", () => {
    notFoundMock.mockClear();
    const error = new ApiRequestError("Bad request", 400);

    expect(() => notFoundOrRethrow(error)).toThrow(error);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

describe("isUpstreamFailure", () => {
  it("treats 5xx and network errors as upstream failures", () => {
    expect(isUpstreamFailure(new ApiRequestError("boom", 500))).toBe(true);
    expect(isUpstreamFailure(new ApiRequestError("boom", 503))).toBe(true);
    expect(isUpstreamFailure(new TypeError("fetch failed"))).toBe(true);
  });

  it("does not treat a 404 as an upstream failure", () => {
    expect(isUpstreamFailure(new ApiRequestError("missing", 404))).toBe(false);
  });
});
