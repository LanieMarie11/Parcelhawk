import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

/** Lightweight endpoint to verify admin API auth (Module 3). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  return NextResponse.json({
    ok: true,
    email: admin.session.user.email,
  });
}
