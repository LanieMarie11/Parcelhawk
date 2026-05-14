import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import type { NextRequest } from "next/server";
import { attachLastActivePing } from "@/lib/last-active-middleware";

/** Paths reachable without a session (sign-in lives on `/` per next-auth pages config). */
function isGuestPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // NextAuth session is checked on every request (every URL change / navigation)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

  // Logged-in investors use /realtor-portal as home; keep / for buyers/guests
  if (path === "/" && token?.role === "investor") {
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL("/realtor-portal", request.url))
    );
  }

  const isInvestorOnlyPath =
    path === "/realtor-portal" ||
    path.startsWith("/realtor-portal/") ||
    path === "/investor-portal" ||
    path.startsWith("/investor-portal/");
  if (isInvestorOnlyPath && token?.role !== "investor") {
    const fallback =
      token?.role === "buyer" ? "/buyer-dashboard" : "/";
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL(fallback, request.url))
    );
  }

  if (!token && !isGuestPublicPath(path)) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("auth", "login-required");
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.next();
  return attachLastActivePing(request, event, path, token, response);
}

export const config = {
  matcher: [
    // Negative-lookahead matchers often omit `/`; include `/` so root redirects run
    "/",
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
