import type { NextRequest } from "next/server";

export const INVESTOR_SUBSCRIBE_PATH = "/realtor-portal/subscribe";

export function isInvestorSubscriptionExemptPath(pathname: string): boolean {
  if (pathname === INVESTOR_SUBSCRIBE_PATH) return true;
  if (pathname.startsWith("/api/investor/subscription/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/webhooks/stripe") return true;
  return false;
}

export function isInvestorSubscriptionGatedPath(pathname: string): boolean {
  if (
    pathname === "/realtor-portal" ||
    pathname.startsWith("/realtor-portal/") ||
    pathname === "/investor-portal" ||
    pathname.startsWith("/investor-portal/")
  ) {
    return true;
  }

  if (
    pathname.startsWith("/api/realtor-portal/") ||
    pathname.startsWith("/api/investor-portal/")
  ) {
    return true;
  }

  return false;
}

export async function fetchInvestorSubscriptionActive(
  request: NextRequest,
): Promise<boolean | null> {
  try {
    const url = new URL("/api/investor/subscription/status", request.url);
    const response = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { active?: boolean };
    return Boolean(data.active);
  } catch {
    return null;
  }
}

export async function getInvestorPortalHomePath(
  request: NextRequest,
): Promise<string> {
  const active = await fetchInvestorSubscriptionActive(request);
  if (active === false) return INVESTOR_SUBSCRIBE_PATH;
  return "/realtor-portal";
}
