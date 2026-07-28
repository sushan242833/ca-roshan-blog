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

export type ValidationIssue = { field: string; message: string };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// error.details is untrusted (typed `unknown`), so validate each entry before
// use; malformed entries are skipped and an empty result collapses to undefined.
function parseValidationIssues(details: unknown): ValidationIssue[] | undefined {
  if (!Array.isArray(details)) {
    return undefined;
  }

  const issues: ValidationIssue[] = [];
  for (const item of details) {
    if (
      typeof item === "object" &&
      item !== null &&
      "field" in item &&
      "message" in item
    ) {
      const { field, message } = item;
      if (typeof field === "string" && typeof message === "string") {
        issues.push({ field, message });
      }
    }
  }

  return issues.length > 0 ? issues : undefined;
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
    const details = !body.success
      ? parseValidationIssues(body.error?.details)
      : undefined;
    throw new ApiRequestError(message, res.status, code, details);
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
