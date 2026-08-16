import { notFound } from "next/navigation";
import { ApiRequestError } from "@/lib/api";

export function notFoundOrRethrow(error: unknown): never {
  if (error instanceof ApiRequestError && error.status === 404) {
    notFound();
  }

  throw error;
}

export function isUpstreamFailure(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status >= 500 || error.status === 0;
  }

  return true;
}
