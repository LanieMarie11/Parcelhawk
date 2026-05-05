import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, messageThreads, viewingRequests } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { mergeThreadTimeline } from "@/lib/thread-timeline";

type SessionUser = {
  id?: string;
  role?: string;
};

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const buyerUserId = sessionUser.id;
  if (!buyerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await context.params;
  const [thread] = await db
    .select({
      id: messageThreads.id,
      investorId: messageThreads.investorId,
      buyerUserId: messageThreads.buyerUserId,
    })
    .from(messageThreads)
    .where(and(eq(messageThreads.id, threadId), eq(messageThreads.buyerUserId, buyerUserId)))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const [messageRows, viewingRows] = await Promise.all([
    db
      .select({
        id: messages.id,
        senderRole: messages.senderRole,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt)),
    db
      .select({
        id: viewingRequests.id,
        listingId: viewingRequests.listingId,
        status: viewingRequests.status,
        buyerNote: viewingRequests.buyerNote,
        scheduledAt: viewingRequests.scheduledAt,
        completedAt: viewingRequests.completedAt,
        createdAt: viewingRequests.createdAt,
        updatedAt: viewingRequests.updatedAt,
      })
      .from(viewingRequests)
      .where(
        and(
          eq(viewingRequests.buyerId, thread.buyerUserId),
          eq(viewingRequests.realtorId, thread.investorId)
        )
      )
      .orderBy(asc(viewingRequests.createdAt)),
  ]);

  const timeline = mergeThreadTimeline(messageRows, viewingRows);

  return NextResponse.json({ timeline });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const buyerUserId = sessionUser.id;
  if (!buyerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await context.params;
  const [thread] = await db
    .select({ id: messageThreads.id })
    .from(messageThreads)
    .where(and(eq(messageThreads.id, threadId), eq(messageThreads.buyerUserId, buyerUserId)))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(messages)
    .values({
      threadId,
      senderRole: "buyer",
      senderBuyerUserId: buyerUserId,
      body: text,
    })
    .returning({
      id: messages.id,
      senderRole: messages.senderRole,
      body: messages.body,
      createdAt: messages.createdAt,
    });

  await db
    .update(messageThreads)
    .set({ updatedAt: new Date() })
    .where(eq(messageThreads.id, threadId));

  return NextResponse.json({
    message: {
      id: created.id,
      sender: created.senderRole,
      text: created.body,
      createdAt: created.createdAt.toISOString(),
    },
  });
}
