import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import type { NextRequest } from "next/server";
import { attachLastActivePing } from "@/lib/last-active-middleware";
import {
  fetchInvestorSubscriptionActive,
  getInvestorPortalHomePath,
  INVESTOR_SUBSCRIBE_PATH,
  isInvestorSubscriptionExemptPath,
  isInvestorSubscriptionGatedPath,
} from "@/lib/investor-subscription-gate";

/** Paths reachable without a session (sign-in lives on `/` per next-auth pages config). */
function isGuestPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) return true;
  if (pathname === "/admin/sign-in") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/webhooks/stripe") return true;
  return false;
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminSignInPath(pathname: string): boolean {
  return pathname === "/admin/sign-in";
}

function isInvestorOnlyPath(pathname: string): boolean {
  return (
    pathname === "/realtor-portal" ||
    pathname.startsWith("/realtor-portal/") ||
    pathname === "/investor-portal" ||
    pathname.startsWith("/investor-portal/")
  );
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // NextAuth session is checked on every request (every URL change / navigation)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

  if (isAdminSignInPath(path) && token?.role === "admin") {
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL("/admin", request.url))
    );
  }

  if (isAdminPath(path) && !isAdminSignInPath(path) && token?.role !== "admin") {
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL("/admin/sign-in", request.url))
    );
  }

  if (isInvestorOnlyPath(path) && token?.role === "admin") {
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL("/admin", request.url))
    );
  }

  // Logged-in investors use /realtor-portal as home; inactive subscribers go to subscribe
  if (path === "/" && token?.role === "investor") {
    const homePath = await getInvestorPortalHomePath(request);
    return attachLastActivePing(
      request,
      event,
      path,
      token,
      NextResponse.redirect(new URL(homePath, request.url))
    );
  }

  if (
    token?.role === "investor" &&
    isInvestorSubscriptionGatedPath(path) &&
    !isInvestorSubscriptionExemptPath(path)
  ) {
    const active = await fetchInvestorSubscriptionActive(request);
    if (active === false) {
      if (path.startsWith("/api/")) {
        return attachLastActivePing(
          request,
          event,
          path,
          token,
          NextResponse.json(
            { error: "Active subscription required" },
            { status: 403 },
          ),
        );
      }

      return attachLastActivePing(
        request,
        event,
        path,
        token,
        NextResponse.redirect(new URL(INVESTOR_SUBSCRIBE_PATH, request.url)),
      );
    }
  }

  const isInvestorOnly =
    isInvestorOnlyPath(path);
  if (isInvestorOnly && token?.role !== "investor") {
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
    if (path.startsWith("/api/admin/")) {
      const response = NextResponse.next();
      return attachLastActivePing(request, event, path, token, response);
    }

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
