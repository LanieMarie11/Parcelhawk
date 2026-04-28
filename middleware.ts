import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // NextAuth session is checked on every request (every URL change / navigation)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = request.nextUrl.pathname;

  // Logged-in investors use /realtor-portal as home; keep / for buyers/guests
  if (path === "/" && token?.role === "investor") {
    return NextResponse.redirect(new URL("/realtor-portal", request.url));
  }

  const isInvestorOnlyPath =
    path === "/realtor-portal" ||
    path.startsWith("/realtor-portal/") ||
    path === "/investor-portal" ||
    path.startsWith("/investor-portal/");
  if (isInvestorOnlyPath && token?.role !== "investor") {
    const fallback =
      token?.role === "buyer" ? "/buyer-dashboard" : "/";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  const protectedPaths = ["/profile-setting"];
  const isProtected = protectedPaths.some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  return response;
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
