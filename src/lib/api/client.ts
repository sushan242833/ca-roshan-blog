import { API_BASE_URL } from "@/config/site.config";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  error?: { code: string; details?: unknown };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { next?: { revalidate?: number | false } } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // 204 No Content (e.g. DELETE) has no JSON body to unwrap — treat it as
  // success with no data instead of failing on res.json().
  if (res.status === 204) {
    return undefined as T;
  }

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError("Invalid response from server.", res.status);
  }

  if (!res.ok || !body.success) {
    const message = !body.success ? body.message : "Request failed.";
    const code = !body.success ? body.error?.code : undefined;
    throw new ApiRequestError(message, res.status, code);
  }

  return body.data;
}

// Injects the Authorization header for authenticated admin calls — the one
// place that ever builds this header, so callers never build it by hand.
export function authenticatedApiRequest<T>(
  path: string,
  accessToken: string | null,
  options: RequestInit & { next?: { revalidate?: number | false } } = {},
): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
}
