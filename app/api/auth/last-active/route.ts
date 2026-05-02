import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { touchLastActiveIfStale } from "@/lib/touch-last-active";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.role) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await touchLastActiveIfStale(user.id, user.role);
  return NextResponse.json({ ok: true });
}
