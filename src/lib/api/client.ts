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

export type ApiRequestOptions = RequestInit & {
  next?: { revalidate?: number | false };
};

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

async function unwrapResponse<T>(res: Response): Promise<T> {
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

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return unwrapResponse<T>(res);
}

// Multipart variant of authenticatedApiRequest. Content-Type is deliberately
// NOT set: the browser must generate the multipart boundary itself.
export async function authenticatedUploadRequest<T>(
  path: string,
  accessToken: string | null,
  formData: FormData,
): Promise<T> {
  if (accessToken === null) {
    throw new ApiRequestError("Not authenticated.", 401);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  return unwrapResponse<T>(res);
}

// Injects the Authorization header for authenticated admin calls — the one
// place that ever builds this header, so callers never build it by hand.
// A null token fails fast instead of sending an unauthenticated request the
// backend would reject with a less obvious 401 anyway.
export function authenticatedApiRequest<T>(
  path: string,
  accessToken: string | null,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (accessToken === null) {
    return Promise.reject(new ApiRequestError("Not authenticated.", 401));
  }

  return apiRequest<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
}
