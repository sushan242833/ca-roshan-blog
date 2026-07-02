import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const ADMIN_PATH_PREFIX = "/admin";
const ADMIN_DEFAULT_PATH = "/admin/";
const LOGIN_PATH = "/login";

// TODO: presence-only check — any truthy cookie value passes, valid or not.
// Real auth is enforced by the backend's JWT-verified tokens; this is just an
// edge-level UX gate. To harden: verify a signed session JWT here with the
// `jose` library (Edge-compatible), or keep this lightweight and rely on
// AdminGuard + the backend for actual verification.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith(ADMIN_PATH_PREFIX);
  const isLoginRoute = pathname.startsWith(LOGIN_PATH);

  if (!isAdminRoute && !isLoginRoute) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (isAdminRoute && !hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(new URL(ADMIN_DEFAULT_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
