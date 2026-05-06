import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages, messageThreads, viewingRequests } from "@/db/schema";
import { authOptions } from "@/lib/auth";

type SessionUser = {
  id?: string;
  role?: string;
};

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
    const [messageResult] = await db
      .select({
        unreadCount: sql<number>`count(*)`,
      })
      .from(messages)
      .innerJoin(messageThreads, eq(messages.threadId, messageThreads.id))
      .where(
        and(
          eq(messageThreads.buyerUserId, buyerUserId),
          eq(messages.senderRole, "investor"),
          or(isNull(messageThreads.buyerLastReadAt), gt(messages.createdAt, messageThreads.buyerLastReadAt)),
        ),
      );

    const threadRows = await db
      .select({ investorId: messageThreads.investorId, buyerLastReadAt: messageThreads.buyerLastReadAt })
      .from(messageThreads)
      .where(eq(messageThreads.buyerUserId, buyerUserId));

    const investorIds = threadRows.map((row) => row.investorId);
    const buyerLastReadByInvestorId = new Map(
      threadRows.map((row) => [row.investorId, row.buyerLastReadAt]),
    );

    let viewingRequestsUnreadCount = 0;
    if (investorIds.length > 0) {
      const viewingRows = await db
        .select({
          realtorId: viewingRequests.realtorId,
          updatedAt: viewingRequests.updatedAt,
        })
        .from(viewingRequests)
        .where(
          and(
            eq(viewingRequests.buyerId, buyerUserId),
            inArray(viewingRequests.realtorId, investorIds),
            ne(viewingRequests.status, "pending"),
          ),
        );

      for (const request of viewingRows) {
        const buyerLastReadAt = buyerLastReadByInvestorId.get(request.realtorId);
        if (buyerLastReadAt && request.updatedAt <= buyerLastReadAt) continue;
        viewingRequestsUnreadCount += 1;
      }
    }
    console.log("viewingRequestsUnreadCount", viewingRequestsUnreadCount);
    return NextResponse.json({
      unreadCount: Number(messageResult?.unreadCount ?? 0) + viewingRequestsUnreadCount,
    });
  } catch (error) {
    console.error("Buyer unread count fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch unread count" }, { status: 500 });
  }
}
