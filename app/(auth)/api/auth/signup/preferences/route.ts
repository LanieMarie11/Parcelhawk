import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type Body = {
  userId: string;
  budget: string | null;
  acreage: string | null;
  purpose: string | null;
  timeframe: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const updates: {
      preferenceBudget?: string | null;
      preferenceAcreage?: string | null;
      preferencePurpose?: string | null;
      preferenceTimeframe?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (body.budget !== undefined) {
      updates.preferenceBudget = body.budget;
    }
    if (body.acreage !== undefined) {
      updates.preferenceAcreage = body.acreage;
    }
    if (body.purpose !== undefined) {
      updates.preferencePurpose = body.purpose;
    }
    if (body.timeframe !== undefined) {
      updates.preferenceTimeframe = body.timeframe;
    }

    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup preferences update error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

