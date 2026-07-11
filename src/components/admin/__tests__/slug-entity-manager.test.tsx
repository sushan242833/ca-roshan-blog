import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthProvider from "@/components/providers/auth-provider";
import { useAuthStore } from "@/store/auth-store";
import SlugEntityManager from "@/components/admin/slug-entity-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

const EXISTING_CATEGORIES: CategoryRow[] = [
  {
    id: "cat-1",
    name: "Taxation",
    slug: "taxation",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "cat-2",
    name: "Audit",
    slug: "audit",
    createdAt: "2026-02-10T00:00:00.000Z",
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function success(data: unknown, status = 200): Response {
  return jsonResponse({ success: true, data }, status);
}

// Fetch-boundary stub of the whole admin flow: auth session restore, the
// category collection endpoint (stateful — POSTs show up in later GETs), and
// the same-origin revalidate route. Everything below it is real client code.
function stubCategoryApi() {
  const categories = [...EXISTING_CATEGORIES];
  const postedBodies: string[] = [];
  const revalidateBodies: string[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";

    if (path === "/v1/auth/refresh" && method === "POST") {
      return success({ accessToken: "token-1" });
    }
    if (path === "/v1/auth/me") {
      return success({ id: "admin-1", email: "admin@example.test" });
    }
    if (path === "/v1/categories" && method === "GET") {
      return success(categories);
    }
    if (path === "/v1/categories" && method === "POST") {
      const body = String(init?.body);
      postedBodies.push(body);
      const { name, slug } = JSON.parse(body) as { name: string; slug?: string };
      const created: CategoryRow = {
        id: `cat-${categories.length + 1}`,
        name,
        slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
        createdAt: "2026-03-01T00:00:00.000Z",
      };
      categories.push(created);
      return success(created, 201);
    }
    if (path === "/api/revalidate" && method === "POST") {
      revalidateBodies.push(String(init?.body));
      return jsonResponse({ revalidated: true });
    }
    throw new Error(`Unexpected fetch to "${method} ${path}" in test.`);
  });
  vi.stubGlobal("fetch", fetchMock);

  return { fetchMock, postedBodies, revalidateBodies };
}

function renderManager() {
  // Fresh client per render; retries off so failures surface immediately.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SlugEntityManager<CategoryRow>
          entityLabel="Category"
          entityLabelPlural="Categories"
          apiPath="/v1/categories"
          title="Categories"
          subtitle="Organize your content."
          nameMaxLength={100}
          revalidateScope="categories"
        />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

// The Zustand auth store is a module singleton — reset it so each test starts
// from a clean, unauthenticated state and re-runs session restore.
beforeEach(() => {
  useAuthStore.setState({ admin: null, accessToken: null, isLoading: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SlugEntityManager", () => {
  it("renders the rows returned by the list endpoint", async () => {
    stubCategoryApi();
    renderManager();

    expect(await screen.findByText("Taxation")).toBeInTheDocument();
    expect(screen.getByText("Audit")).toBeInTheDocument();
    expect(screen.getByText("taxation")).toBeInTheDocument();
  });

  it("creates an entity from the dialog and shows the new row after refresh", async () => {
    const api = stubCategoryApi();
    const user = userEvent.setup();
    renderManager();

    await screen.findByText("Taxation");
    await user.click(screen.getByRole("button", { name: /new category/i }));

    await user.type(screen.getByLabelText(/name/i), "Compliance");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    expect(await screen.findByText("Compliance")).toBeInTheDocument();
    expect(api.postedBodies).toEqual([JSON.stringify({ name: "Compliance" })]);
    await waitFor(() =>
      expect(api.revalidateBodies).toEqual([
        JSON.stringify({ scope: "categories" }),
      ]),
    );
  });
});
