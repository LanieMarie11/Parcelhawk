import { NextResponse } from "next/server";
import {
  listAdminUsers,
  parseAdminUserTypeFilter,
} from "@/lib/admin-users";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const type = parseAdminUserTypeFilter(searchParams.get("type"));
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const result = await listAdminUsers({
      q,
      type,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 25,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}
