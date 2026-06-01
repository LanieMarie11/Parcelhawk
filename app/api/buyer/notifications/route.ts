import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  investors,
  landListings,
  messageThreads,
  notifications,
  users,
  viewingRequests,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { sendBuyerConnectedToRealtorNotification } from "@/lib/email/send-buyer-connected-notification";
import type { NotificationMetadata } from "@/db/schema/notifications";

type SessionUser = {
  id?: string;
  role?: string;
};

export type BuyerNotificationAction =
  | { type: "single"; label: string; href?: string }
  | {
      type: "dual";
      primary: { label: string; href?: string };
      secondary: { label: string };
    };

export type BuyerNotificationItem = {
  id: string;
  title: string;
  timestamp: string;
  readAt?: string;
  category: string;
  description: string;
  unread: boolean;
  avatar?: {
    initials: string;
    bgColor: string;
  };
  actions: BuyerNotificationAction;
};

const AVATAR_COLORS = ["#FDE68A", "#BFDBFE", "#FECACA", "#BBF7D0", "#E9D5FF"];

function formatRelativeTime(value: Date): string {
  const diffMs = Date.now() - value.getTime();
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

function avatarColor(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

function viewingRequestDetailsHref(
  listingUrl: string | null,
  listingId: number | null,
): string {
  const url = listingUrl?.trim();
  if (url) return url;
  if (listingId != null) return `/property?id=${listingId}`;
  return "/land-property";
}

function investorInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

function isBuyerUnread(metadata: NotificationMetadata | null, readAt: Date | null): boolean {
  if (metadata?.sender === "buyer") {
    return false;
  }
  return readAt == null;
}

function mapNotificationRow(row: {
  id: string;
  type: "viewing_request" | "link_invitation";
  title: string | null;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
  metadata: NotificationMetadata | null;
  investorFirstName: string | null;
  investorLastName: string | null;
  investorId: string | null;
  listingId: number | null;
  listingUrl: string | null;
  listingTitle: string | null;
  viewingStatus: string | null;
}): BuyerNotificationItem {
  const investorName =
    row.metadata?.investorName ??
    `${row.investorFirstName ?? ""} ${row.investorLastName ?? ""}`.trim();
  const avatar =
    investorName || row.investorId
      ? {
          initials: investorInitials(row.investorFirstName, row.investorLastName),
          bgColor: avatarColor(row.investorId ?? investorName),
        }
      : undefined;

  if (row.type === "link_invitation") {
    const isEnded = row.metadata?.status === "ended";

    if (isEnded) {
      return {
        id: row.id,
        title: row.title ?? "Realtor connection ended",
        timestamp: formatRelativeTime(row.createdAt),
        readAt: row.readAt ? row.readAt.toISOString() : undefined,
        category: "Invitation",
        description:
          row.body ??
          (investorName
            ? `Your connection with ${investorName} has ended.`
            : "Your realtor connection has ended."),
        unread: isBuyerUnread(row.metadata, row.readAt),
        avatar,
        actions: {
          type: "single",
          label: "View details",
        },
      };
    }

    return {
      id: row.id,
      title: row.title ?? "New Realtor Connection Request",
      timestamp: formatRelativeTime(row.createdAt),
      readAt: row.readAt ? row.readAt.toISOString() : undefined,
      category: "Invitation",
      description:
        row.body ??
        (investorName
          ? `${investorName} wants to connect with you as your dedicated land specialist.`
          : "A realtor wants to connect with you on ParcelHawk."),
      unread: isBuyerUnread(row.metadata, row.readAt),
      avatar,
      actions: {
        type: "dual",
        primary: { label: "Connect" },
        secondary: { label: "Ignore" },
      },
    };
  }

  const listingLabel = row.metadata?.listingTitle ?? row.listingTitle ?? "a parcel";
  const status = row.viewingStatus ?? row.metadata?.status;

  return {
    id: row.id,
    title: row.title ?? "Viewing request update",
    timestamp: formatRelativeTime(row.createdAt),
    readAt: row.readAt ? row.readAt.toISOString() : undefined,
    category: "Viewing request",
    description:
      row.body ??
      (status
        ? `Your viewing request for ${listingLabel} is now ${status}.`
        : `There is an update on your viewing request for ${listingLabel}.`),
    unread: isBuyerUnread(row.metadata, row.readAt),
    actions: {
      type: "single",
      label: "View Details",
      href: viewingRequestDetailsHref(row.listingUrl, row.listingId),
    },
  };
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
    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        metadata: notifications.metadata,
        listingId: notifications.listingId,
        investorId: notifications.investorId,
        investorFirstName: investors.firstName,
        investorLastName: investors.lastName,
        listingTitle: landListings.title,
        listingUrl: landListings.url,
        viewingStatus: viewingRequests.status,
      })
      .from(notifications)
      .leftJoin(investors, eq(notifications.investorId, investors.id))
      .leftJoin(viewingRequests, eq(notifications.viewingRequestId, viewingRequests.id))
      .leftJoin(landListings, eq(notifications.listingId, landListings.id))
      .orderBy(desc(notifications.createdAt));

    return NextResponse.json({
      notifications: rows.map(mapNotificationRow),
    });
  } catch (error) {
    console.error("Buyer notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const buyerUserId = sessionUser.id;

  if (!buyerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  if (action !== "connect" && action !== "ignore" && action !== "read") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const now = new Date();
    const [targetNotification] = await db
      .select({
        id: notifications.id,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
      .limit(1);

    if (!targetNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (targetNotification.metadata?.sender === "buyer") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let updated: { id: string } | undefined;
    let connectedEmailPayload:
      | {
          buyerName: string;
          realtorName: string;
          investorId: string;
          realtorEmail: string;
        }
      | undefined;

    if (action === "connect") {
      const result = await db.transaction(async (tx) => {
        const [notification] = await tx
          .select({
            id: notifications.id,
            investorId: notifications.investorId,
          })
          .from(notifications)
          .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
          .limit(1);

        if (!notification) {
          return { error: "not_found" as const };
        }

        if (!notification.investorId) {
          return { error: "missing_investor" as const };
        }

        const [investor] = await tx
          .select({
            referralUrl: investors.referralUrl,
            firstName: investors.firstName,
            lastName: investors.lastName,
            email: investors.email,
          })
          .from(investors)
          .where(eq(investors.id, notification.investorId))
          .limit(1);

        if (!investor?.referralUrl) {
          return { error: "missing_referral" as const };
        }

        const [existingActiveLink] = await tx
          .select({
            id: buyerInvestorLinks.id,
            investorId: buyerInvestorLinks.investorId,
          })
          .from(buyerInvestorLinks)
          .where(
            and(
              eq(buyerInvestorLinks.buyerId, buyerUserId),
              eq(buyerInvestorLinks.status, "active"),
            ),
          )
          .limit(1);

        if (existingActiveLink && existingActiveLink.investorId !== notification.investorId) {
          return { error: "already_linked_other" as const };
        }

        if (!existingActiveLink) {
          await tx.insert(buyerInvestorLinks).values({
            buyerId: buyerUserId,
            investorId: notification.investorId,
            status: "active",
            linkedVia: "invitation",
          });
        }

        await tx
          .update(users)
          .set({ referralId: investor.referralUrl, updatedAt: now })
          .where(eq(users.id, buyerUserId));

        await tx
          .insert(messageThreads)
          .values({
            investorId: notification.investorId,
            buyerUserId,
          })
          .onConflictDoNothing({
            target: [messageThreads.investorId, messageThreads.buyerUserId],
          });

        const [updatedNotification] = await tx
          .update(notifications)
          .set({ readAt: now, updatedAt: now })
          .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
          .returning({ id: notifications.id });

        let emailPayload:
          | {
              buyerName: string;
              realtorName: string;
              investorId: string;
              realtorEmail: string;
            }
          | undefined;
        if (investor.email?.trim()) {
          const [buyer] = await tx
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(eq(users.id, buyerUserId))
            .limit(1);

          if (buyer) {
            const buyerDisplayName =
              `${buyer.firstName} ${buyer.lastName}`.trim() || "(unknown buyer)";
            const realtorDisplayName =
              `${investor.firstName} ${investor.lastName}`.trim() || "there";
            emailPayload = {
              buyerName: buyerDisplayName,
              realtorName: realtorDisplayName,
              investorId: notification.investorId,
              realtorEmail: investor.email.trim(),
            };
          }
        }

        return { updated: updatedNotification, emailPayload };
      });

      if ("error" in result) {
        if (result.error === "not_found") {
          return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }
        if (result.error === "missing_investor") {
          return NextResponse.json(
            { error: "Notification is missing investor reference" },
            { status: 409 },
          );
        }
        if (result.error === "already_linked_other") {
          return NextResponse.json(
            { error: "Buyer is already linked to another realtor" },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: "Investor referral link not found" }, { status: 404 });
      }

      updated = result.updated;
      connectedEmailPayload = result.emailPayload;
    } else if (action === "ignore") {
      [updated] = await db
        .update(notifications)
        .set({ dismissedAt: now, readAt: now, updatedAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });
    } else {
      [updated] = await db
        .update(notifications)
        .set({ readAt: now, updatedAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });
    }

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (action === "connect" && connectedEmailPayload) {
      try {
        await sendBuyerConnectedToRealtorNotification(connectedEmailPayload);
      } catch (emailError) {
        console.error("sendBuyerConnectedToRealtorNotification:", emailError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Buyer notification action error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
