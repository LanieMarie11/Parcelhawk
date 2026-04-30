import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { investors, users } from "./users";

/**
 * 1:1 chat thread between one investor and one buyer.
 * Keep exactly one thread per pair for a clean history.
 */
export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investorId: uuid("investor_id")
      .notNull()
      .references(() => investors.id, { onDelete: "cascade" }),
    buyerUserId: uuid("buyer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("message_threads_investor_buyer_idx").on(table.investorId, table.buyerUserId),
  ],
);

export const messageSenderRoleEnum = pgEnum("message_sender_role", ["investor", "buyer"]);

/**
 * Individual chat message.
 * We keep both senderRole and sender ids because users/investors are separate tables.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    senderRole: messageSenderRoleEnum("sender_role").notNull(),
    senderInvestorId: uuid("sender_investor_id").references(() => investors.id, {
      onDelete: "cascade",
    }),
    senderBuyerUserId: uuid("sender_buyer_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_thread_created_idx").on(table.threadId, table.createdAt),
  ],
);
