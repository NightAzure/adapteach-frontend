import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "adapteach_access_token";
const REFRESH_COOKIE = "adapteach_refresh_token";

export function middleware(request: NextRequest) {
  // Allow through if either cookie is present.
  // The access token cookie expires in 15 min (browser deletes it), but the
  // refresh token lives for 7 days. When only the refresh cookie is present,
  // the first API call will get a 401, the client interceptor will silently
  // refresh and retry. Redirecting here would prevent that from ever happening.
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
};
