import { NextResponse } from "next/server";
import { getAdminUserDetail, parseAdminUserKind } from "@/lib/admin-users";
import { requireAdmin } from "@/lib/require-admin";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { kind: kindRaw, id } = await context.params;
    const kind = parseAdminUserKind(kindRaw);

    if (!kind) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const user = await getAdminUserDetail(kind, id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin user detail error:", error);
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    );
  }
}
