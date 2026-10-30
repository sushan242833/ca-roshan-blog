import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthProvider from "@/components/providers/auth-provider";
import FeaturedSlotsManager from "@/components/admin/featured-slots-manager";
import { useAuthStore } from "@/store/auth-store";
import type { FeaturedSlot, PostSummaryResponse } from "@/types/post";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function makePost(
  id: string,
  title: string,
  overrides: Partial<PostSummaryResponse> = {},
): PostSummaryResponse {
  return {
    id,
    title,
    slug: id,
    excerpt: null,
    status: "PUBLISHED",
    featured: true,
    featuredPosition: null,
    metaTitle: null,
    metaDescription: null,
    pdfUrl: null,
    pdfLabel: null,
    featuredImage: null,
    showFeaturedImage: true,
    showInHero: false,
    category: { id: "cat-1", name: "Taxation", slug: "taxation" },
    categories: [],
    tags: [],
    author: null,
    readingTime: 3,
    viewCount: 0,
    publishedAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const ALPHA = makePost("post-a", "Alpha", { featuredPosition: 1 });
const BRAVO = makePost("post-b", "Bravo", { featuredPosition: 2 });
const CHARLIE = makePost("post-c", "Charlie");
const HERO = makePost("post-h", "Hero post", { featured: false, showInHero: true });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function success(data: unknown, status = 200): Response {
  return jsonResponse({ success: true, data }, status);
}

function slotsOf(posts: (PostSummaryResponse | null)[]): FeaturedSlot[] {
  return Array.from({ length: 6 }, (_, index) => ({
    position: index + 1,
    post: posts[index] ?? null,
  }));
}

interface StubOptions {
  putResponse?: Response;
}

// Fetch-boundary stub: session restore, the featured slots endpoint, the
// published-posts picker list and the same-origin revalidate route.
function stubFeaturedApi(options: StubOptions = {}) {
  const putBodies: unknown[] = [];
  const listPaths: string[] = [];
  const revalidateBodies: string[] = [];
  const byId = new Map([ALPHA, BRAVO, CHARLIE].map((post) => [post.id, post]));

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";

    if (path === "/v1/auth/refresh" && method === "POST") {
      return success({ accessToken: "token-1" });
    }
    if (path === "/v1/auth/me") {
      return success({ id: "admin-1", email: "admin@example.test" });
    }
    if (path === "/v1/admin/featured-posts" && method === "GET") {
      return success({ slots: slotsOf([ALPHA, BRAVO]) });
    }
    if (path === "/v1/admin/featured-posts" && method === "PUT") {
      const body = JSON.parse(String(init?.body)) as {
        slots: { position: number; postId: string | null }[];
      };
      putBodies.push(body);
      if (options.putResponse) return options.putResponse;
      return success({
        slots: body.slots.map((slot) => ({
          position: slot.position,
          post: slot.postId ? (byId.get(slot.postId) ?? null) : null,
        })),
      });
    }
    if (path.startsWith("/v1/posts/admin/list?")) {
      listPaths.push(path);
      return success({
        items: [ALPHA, BRAVO, CHARLIE, HERO],
        pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
      });
    }
    if (path === "/api/revalidate" && method === "POST") {
      revalidateBodies.push(String(init?.body));
      return jsonResponse({ revalidated: true });
    }
    throw new Error(`Unexpected fetch to "${method} ${path}" in test.`);
  });
  vi.stubGlobal("fetch", fetchMock);

  return { putBodies, listPaths, revalidateBodies };
}

function renderManager() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeaturedSlotsManager />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function slot(position: number) {
  return within(screen.getByRole("listitem", { name: `Slot ${position}` }));
}

beforeEach(() => {
  useAuthStore.setState({ admin: null, accessToken: null, isLoading: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeaturedSlotsManager", () => {
  it("shows six numbered slots with the saved posts and empty slots", async () => {
    stubFeaturedApi();
    renderManager();

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem", { name: /^Slot \d$/ })).toHaveLength(6);
    expect(slot(2).getByText("Bravo")).toBeInTheDocument();
    expect(slot(3).getByText("Empty slot")).toBeInTheDocument();
    expect(slot(1).getByText(/Taxation · Jun 01, 2026/)).toBeInTheDocument();
  });

  it("keeps the hero post out of the picker", async () => {
    stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(3).getByRole("button", { name: "Choose post" }));

    const results = await screen.findByRole("list", {
      name: "Published posts for slot 3",
    });
    expect(within(results).getByRole("button", { name: /Hero post/ })).toBeDisabled();
    expect(within(results).getByText("In the hero")).toBeInTheDocument();
  });

  it("disables moving past either end and Save until something changes", async () => {
    stubFeaturedApi();
    renderManager();

    await screen.findByText("Alpha");
    expect(slot(1).getByRole("button", { name: "Move slot 1 up" })).toBeDisabled();
    expect(slot(6).getByRole("button", { name: "Move slot 6 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("moves posts up and down", async () => {
    stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(1).getByRole("button", { name: "Move slot 1 down" }));
    expect(slot(1).getByText("Bravo")).toBeInTheDocument();
    expect(slot(2).getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await user.click(slot(2).getByRole("button", { name: "Move slot 2 up" }));
    expect(slot(1).getByText("Alpha")).toBeInTheDocument();
    // Back to the saved layout, so nothing is left to save.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("clears a slot", async () => {
    stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(2).getByRole("button", { name: "Clear slot 2" }));
    expect(slot(2).getByText("Empty slot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("lists only published posts and disables ones held by another slot", async () => {
    const api = stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(3).getByRole("button", { name: "Choose post" }));

    const results = await screen.findByRole("list", {
      name: "Published posts for slot 3",
    });
    expect(api.listPaths[0]).toContain("status=PUBLISHED");
    expect(within(results).getByRole("button", { name: /Alpha/ })).toBeDisabled();
    expect(within(results).getByRole("button", { name: /Bravo/ })).toBeDisabled();
    expect(within(results).getByText("In slot 1")).toBeInTheDocument();

    await user.click(within(results).getByRole("button", { name: /Charlie/ }));
    expect(slot(3).getByText("Charlie")).toBeInTheDocument();
  });

  it("searches published posts after the debounce", async () => {
    const api = stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(3).getByRole("button", { name: "Choose post" }));
    await screen.findByRole("list", { name: "Published posts for slot 3" });

    await user.type(
      screen.getByRole("searchbox", { name: "Search published posts for slot 3" }),
      "vat",
    );
    await waitFor(() =>
      expect(api.listPaths.some((path) => path.includes("search=vat"))).toBe(true),
    );
    expect(
      api.listPaths.filter((path) => path.includes("search=")).length,
    ).toBe(1);
  });

  it("saves the full six-slot layout and revalidates the public pages", async () => {
    const api = stubFeaturedApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(1).getByRole("button", { name: "Move slot 1 down" }));
    await user.click(slot(4).getByRole("button", { name: "Choose post" }));
    const results = await screen.findByRole("list", {
      name: "Published posts for slot 4",
    });
    await user.click(within(results).getByRole("button", { name: /Charlie/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.putBodies).toHaveLength(1));
    expect(api.putBodies[0]).toEqual({
      slots: [
        { position: 1, postId: "post-b" },
        { position: 2, postId: "post-a" },
        { position: 3, postId: null },
        { position: 4, postId: "post-c" },
        { position: 5, postId: null },
        { position: 6, postId: null },
      ],
    });
    await waitFor(() =>
      expect(api.revalidateBodies).toEqual([JSON.stringify({ scope: "posts" })]),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("shows server validation errors next to the slot they belong to", async () => {
    const api = stubFeaturedApi({
      putResponse: jsonResponse(
        {
          success: false,
          message: "Validation failed.",
          error: {
            code: "VALIDATION_ERROR",
            details: [
              {
                field: "slots[1].postId",
                message: "Post does not exist or is not published.",
              },
            ],
          },
        },
        400,
      ),
    });
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Alpha");
    await user.click(slot(1).getByRole("button", { name: "Move slot 1 down" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await slot(2).findByText("Post does not exist or is not published."),
    ).toBeInTheDocument();
    expect(api.revalidateBodies).toEqual([]);
    // The edit is kept so the admin can fix it.
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("asks before following a link away with unsaved changes", async () => {
    stubFeaturedApi();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderManager();

    await screen.findByText("Alpha");
    const link = document.createElement("a");
    link.href = "/admin/posts";
    link.textContent = "Manage Posts";
    document.body.appendChild(link);

    await user.click(link);
    expect(confirm).not.toHaveBeenCalled();

    await user.click(slot(2).getByRole("button", { name: "Clear slot 2" }));
    await user.click(link);
    expect(confirm).toHaveBeenCalledTimes(1);

    link.remove();
    confirm.mockRestore();
  });
});
