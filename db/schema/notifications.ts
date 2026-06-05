import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { buyerInvestorLinks } from "./buyer-investor-links";
import { landListings } from "./listings";
import { investors, users } from "./users";
import { viewingRequests } from "./viewing-requests";

export const notificationTypeEnum = pgEnum("notification_type", [
  "viewing_request",
  "link_invitation",
]);

export const notificationSenderValues = ["buyer", "realtor"] as const;
export type NotificationSender = (typeof notificationSenderValues)[number];

export type NotificationMetadata = {
  /** Deep-link target for notification actions (e.g. buyer land-property). */
  type?: "viewing-requests" | "link-invitation";
  /** Who triggered or owns the notification event. */
  sender?: NotificationSender;
  status?: string;
  listingId?: number;
  listingTitle?: string;
  investorName?: string;
  buyerName?: string;
  endedAt?: string;
  endedBy?: "realtor" | "buyer" | "system";
  endReason?: string;
  endNote?: string;
};

/**
 * In-app notifications for buyers (viewing requests, realtor link invitations).
 * `title` / `body` are optional display snapshots; join related rows when null.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: notificationTypeEnum("type").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    investorId: uuid("investor_id").references(() => investors.id, {
      onDelete: "set null",
    }),
    listingId: integer("listing_id").references(() => landListings.id, {
      onDelete: "set null",
    }),
    viewingRequestId: uuid("viewing_request_id").references(() => viewingRequests.id, {
      onDelete: "cascade",
    }),
    buyerInvestorLinkId: uuid("buyer_investor_link_id").references(
      () => buyerInvestorLinks.id,
      { onDelete: "cascade" },
    ),
    title: text("title"),
    body: text("body"),
    buyerReadAt: timestamp("buyer_read_at", { withTimezone: true }),
    realtorReadAt: timestamp("realtor_read_at", { withTimezone: true }),
    buyerDeleteAt: timestamp("buyer_delete_at", { withTimezone: true }),
    realtorDeleteAt: timestamp("realtor_delete_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<NotificationMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.buyerReadAt),
    uniqueIndex("notifications_viewing_request_recipient_idx").on(
      table.userId,
      table.viewingRequestId,
    ),
    index("notifications_link_invitation_recipient_idx").on(
      table.userId,
      table.buyerInvestorLinkId,
    ),
  ],
);
