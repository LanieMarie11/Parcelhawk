import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  location: text("location"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("buyer"),
  preferenceBudget: text("preference_budget"),
  preferenceAcreage: text("preference_acreage"),
  preferencePurpose: text("preference_purpose"),
  preferenceTimeframe: text("preference_timeframe"),
  domainLink: text("domain_link"),
  referralId: text("referral_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
});

export const investors = pgTable("investors", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  /** Opaque signup ref token; build URLs like /signup?ref=… in the app. */
  referralUrl: text("referral_url").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});
