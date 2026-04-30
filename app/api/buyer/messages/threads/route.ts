import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { investors, messages, messageThreads } from "@/db/schema";
import { authOptions } from "@/lib/auth";

type SessionUser = {
  id?: string;
  role?: string;
};

function formatRelativeTime(value: Date): string {
  const now = Date.now();
  const diffMs = now - value.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} min ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}h ago`;
  }
  if (diffMs < 2 * dayMs) {
    return "Yesterday";
  }
  const days = Math.floor(diffMs / dayMs);
  return `${days}d ago`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const buyerUserId = sessionUser.id;

  if (!buyerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const threads = await db
      .select({
        threadId: messageThreads.id,
        investorId: messageThreads.investorId,
        updatedAt: messageThreads.updatedAt,
        firstName: investors.firstName,
        lastName: investors.lastName,
        avatarUrl: investors.avatarUrl,
      })
      .from(messageThreads)
      .innerJoin(investors, eq(messageThreads.investorId, investors.id))
      .where(eq(messageThreads.buyerUserId, buyerUserId))
      .orderBy(desc(messageThreads.updatedAt));

    if (threads.length === 0) {
      return NextResponse.json({ threads: [] });
    }

    const threadIds = threads.map((thread) => thread.threadId);
    const latestMessages = await db
      .select({
        threadId: messages.threadId,
        body: messages.body,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.threadId, threadIds))
      .orderBy(desc(messages.createdAt));

    const latestByThread = new Map<string, { body: string; createdAt: Date }>();
    for (const item of latestMessages) {
      if (!latestByThread.has(item.threadId)) {
        latestByThread.set(item.threadId, {
          body: item.body,
          createdAt: item.createdAt,
        });
      }
    }

    return NextResponse.json({
      threads: threads.map((thread) => {
        const latest = latestByThread.get(thread.threadId);
        return {
          threadId: thread.threadId,
          investorId: thread.investorId,
          name:
            [thread.firstName, thread.lastName].filter(Boolean).join(" ").trim() ||
            "Unknown realtor",
          avatarUrl: thread.avatarUrl ?? "",
          lastActive: formatRelativeTime(latest?.createdAt ?? thread.updatedAt),
          lastMessagePreview: latest?.body ?? "Start your conversation.",
        };
      }),
    });
  } catch (error) {
    console.error("Buyer message threads fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch message threads" }, { status: 500 });
  }
}
