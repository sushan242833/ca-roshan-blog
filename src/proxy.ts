import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH_PREFIX = "/dashboard";
const LOGIN_PATH = "/login";
const SESSION_COOKIE_NAME = "ca_roshan_session";

// TODO: This currently only checks for cookie presence, not validity.
// Once the admin login flow sets a real session cookie, either:
//   (a) switch to the `jose` library to verify the JWT signature here, or
//   (b) keep this as a lightweight gate and perform full validation
//       in each Server Component via the backend GET /api/v1/auth/me endpoint.
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
    return NextResponse.redirect(
      new URL(ADMIN_PATH_PREFIX, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
