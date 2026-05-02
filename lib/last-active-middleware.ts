import type { NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import {
  LAST_ACTIVE_API_PATH,
  LAST_ACTIVE_COOKIE,
  LAST_ACTIVE_THROTTLE_MS,
} from "@/lib/last-active-constants";

/**
 * Throttled background POST to persist last active time. Edge-safe (no DB import).
 */
export function attachLastActivePing(
  request: NextRequest,
  event: NextFetchEvent,
  pathname: string,
  token: JWT | null,
  response: NextResponse
): NextResponse {
  const userId = (token?.sub ?? token?.id) as string | undefined;
  if (!userId || !token?.role) {
    return response;
  }

  if (pathname === LAST_ACTIVE_API_PATH) {
    return response;
  }

  const raw = request.cookies.get(LAST_ACTIVE_COOKIE)?.value;
  const last = raw ? Number.parseInt(raw, 10) : 0;
  const now = Date.now();
  if (last && !Number.isNaN(last) && now - last < LAST_ACTIVE_THROTTLE_MS) {
    return response;
  }

  response.cookies.set(LAST_ACTIVE_COOKIE, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const pingUrl = new URL(LAST_ACTIVE_API_PATH, request.url);
  event.waitUntil(
    fetch(pingUrl, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    }).catch(() => undefined)
  );

  return response;
}
