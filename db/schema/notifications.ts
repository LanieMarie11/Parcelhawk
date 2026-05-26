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

export type NotificationMetadata = {
  status?: string;
  listingTitle?: string;
  investorName?: string;
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
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<NotificationMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
    uniqueIndex("notifications_viewing_request_recipient_idx").on(
      table.userId,
      table.viewingRequestId,
    ),
    uniqueIndex("notifications_link_invitation_recipient_idx").on(
      table.userId,
      table.buyerInvestorLinkId,
    ),
  ],
);
