import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  investors,
  landUpdatedListings,
  notifications,
  users,
  viewingRequests,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { finalizeRealtorInvitationConnection } from "@/lib/finalize-realtor-invitation-connection";
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
  endReason?: string;
  unread: boolean;
  avatar?: {
    initials: string;
    bgColor: string;
  };
  actions: BuyerNotificationAction;
};

const END_REASON_LABELS: Record<string, string> = {
  not_responsive_enough: "Not responsive enough",
  search_area_changed: "Search area changed",
  found_different_realtor: "Found a different realtor",
  not_good_fit: "Not a good fit",
  other: "Other",
  realtor_removed: "Realtor removed connection",
  account_deleted: "Account deleted",
};

function formatEndReason(reason: string | undefined): string | undefined {
  const key = reason?.trim();
  if (!key) return undefined;
  return END_REASON_LABELS[key] ?? key;
}

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

function isBuyerUnread(buyerReadAt: Date | null): boolean {
  return buyerReadAt == null;
}

function mapNotificationRow(row: {
  id: string;
  type: "viewing_request" | "link_invitation";
  title: string | null;
  body: string | null;
  buyerReadAt: Date | null;
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
  const readAtIso = row.buyerReadAt ? row.buyerReadAt.toISOString() : undefined;

  if (row.type === "link_invitation") {
    const isPending = row.metadata?.status === "pending" || row.metadata?.status == null;
    const isEnded = row.metadata?.status === "ended";

    if (isPending) {
      if (row.metadata?.sender === "realtor") {
        return {
          id: row.id,
          title: "New buyer Connection Request",
          timestamp: formatRelativeTime(row.createdAt),
          readAt: readAtIso,
          category: "Invitation",
          description: investorName
            ? `${investorName} wants to connect with you as your dedicated land specialist.`
            : "A realtor wants to connect with you on ParcelHawk.",
          unread: isBuyerUnread(row.buyerReadAt),
          avatar,
          actions: {
            type: "dual",
            primary: {
              label: "Connect",
            },
            secondary: {
              label: "Ignore",
            },
          },
        };
      }
      if (row.metadata?.sender === "buyer") {
        return {
          id: row.id,
          title: "New realtor connection request",
          timestamp: formatRelativeTime(row.createdAt),
          readAt: readAtIso,
          category: "Invitation",
          description: `You requested to connect with ${investorName || "a realtor"} on ParcelHawk. Waiting for their response.`,
          unread: isBuyerUnread(row.buyerReadAt),
          avatar,
          actions: {
            type: "single",
            label: "View details",
          },
        };
      }
      return {
        id: row.id,
        title: row.title ?? "Connection request sent",
        timestamp: formatRelativeTime(row.createdAt),
        readAt: readAtIso,
        category: "Invitation",
        description:
          row.body ??
          `You requested to connect with ${investorName || "a realtor"} on ParcelHawk. Waiting for their response.`,
        unread: isBuyerUnread(row.buyerReadAt),
        avatar,
        actions: {
          type: "single",
          label: "View details",
        },
      };
    }

    if (isEnded) {
      return {
        id: row.id,
        title: row.title ?? "Realtor connection ended",
        timestamp: formatRelativeTime(row.createdAt),
        readAt: row.buyerReadAt ? row.buyerReadAt.toISOString() : undefined,
        category: "Invitation",
        description:
          row.body ??
          (investorName
            ? `Your connection with ${investorName} has ended.`
            : "Your realtor connection has ended."),
        endReason: formatEndReason(row.metadata?.endReason),
        unread: isBuyerUnread(row.buyerReadAt),
        avatar,
        actions: {
          type: "single",
          label: "View details",
        },
      };
    }

    return {
      id: row.id,
      title: row.title ?? "Realtor connection update",
      timestamp: formatRelativeTime(row.createdAt),
      readAt: row.buyerReadAt ? row.buyerReadAt.toISOString() : undefined,
      category: "Invitation",
      description:
        row.body ??
        (investorName
          ? `There is an update on your connection with ${investorName}.`
          : "There is an update on your realtor connection."),
      unread: isBuyerUnread(row.buyerReadAt),
      avatar,
      actions: {
        type: "single",
        label: "View details",
      },
    };
  }

  const listingLabel = row.metadata?.listingTitle ?? row.listingTitle ?? "a parcel";
  const status = row.viewingStatus ?? row.metadata?.status;

  return {
    id: row.id,
    title: row.title ?? "Viewing request update",
    timestamp: formatRelativeTime(row.createdAt),
    readAt: row.buyerReadAt ? row.buyerReadAt.toISOString() : undefined,
    category: "Viewing request",
    description:
      row.body ??
      (status
        ? `Your viewing request for ${listingLabel} is now ${status}.`
        : `There is an update on your viewing request for ${listingLabel}.`),
    unread: isBuyerUnread(row.buyerReadAt),
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
        buyerReadAt: notifications.buyerReadAt,
        createdAt: notifications.createdAt,
        metadata: notifications.metadata,
        listingId: notifications.listingId,
        investorId: notifications.investorId,
        investorFirstName: investors.firstName,
        investorLastName: investors.lastName,
        listingTitle: landUpdatedListings.title,
        listingUrl: landUpdatedListings.url,
        viewingStatus: viewingRequests.status,
      })
      .from(notifications)
      .leftJoin(investors, eq(notifications.investorId, investors.id))
      .leftJoin(viewingRequests, eq(notifications.viewingRequestId, viewingRequests.id))
      .leftJoin(landUpdatedListings, eq(notifications.listingId, landUpdatedListings.id))
      .where(
        and(eq(notifications.userId, buyerUserId), isNull(notifications.buyerDeleteAt)),
      )
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

  if (action !== "connect" && action !== "ignore" && action !== "read" && action !== "delete") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const now = new Date();
    const [targetNotification] = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        investorId: notifications.investorId,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
      .limit(1);

    if (!targetNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (action === "delete") {
      const [deleted] = await db
        .update(notifications)
        .set({ buyerReadAt: now, buyerDeleteAt: now, updatedAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });

      if (!deleted) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true });
    }

    let updated: { id: string } | undefined;

    if (action === "connect") {
      if (targetNotification.type !== "link_invitation") {
        return NextResponse.json({ error: "Notification does not support connect" }, { status: 409 });
      }

      const isPending =
        targetNotification.metadata?.status === "pending" ||
        targetNotification.metadata?.status == null;
      if (!isPending || targetNotification.metadata?.sender !== "realtor") {
        return NextResponse.json({ error: "Notification is not a pending invitation" }, {
          status: 409,
        });
      }

      const investorId =
        targetNotification.metadata?.investorId?.trim() || targetNotification.investorId;
      if (!investorId) {
        return NextResponse.json({ error: "Notification is missing investor reference" }, {
          status: 409,
        });
      }

      const result = await finalizeRealtorInvitationConnection({
        buyerId: buyerUserId,
        investorId,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }

      [updated] = await db
        .update(notifications)
        .set({
          buyerReadAt: now,
          updatedAt: now,
          metadata: {
            ...targetNotification.metadata,
            status: "active",
          },
        })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });
    } else if (action === "ignore") {
      [updated] = await db
        .update(notifications)
        .set({
          buyerReadAt: now,
          updatedAt: now,
          metadata: {
            ...targetNotification.metadata,
            status: "active",
          },
        })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });
    } else {
      [updated] = await db
        .update(notifications)
        .set({ buyerReadAt: now, updatedAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.userId, buyerUserId)))
        .returning({ id: notifications.id });
    }

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Buyer notification action error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
