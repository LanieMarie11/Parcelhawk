import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AppUserRole } from "@/types/next-auth";

export type AdminSession = Session & {
  user: Session["user"] & {
    id: string;
    role: "admin";
    email: string;
  };
};

export type RequireAdminResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

/** Returns the admin session or a 401/403 JSON response for API routes. */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = (session.user as { role?: AppUserRole }).role;
  if (role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session: session as AdminSession };
}
