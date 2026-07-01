import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  location: text("location"),
  about: text("about"),
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
  lastActiveAt: timestamp("last_active_at"),
  subscriptionStatus: text("subscription_status").notNull().default("free"),
  /** When true, the user receives account and listing updates by email. */
  emailNotifications: boolean("email_notifications").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCodeHash: text("email_verification_code_hash"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
});

export const investors = pgTable("investors", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  address: text("address"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  /** Opaque signup ref token; build URLs like /signup?ref=… in the app. */
  referralUrl: text("referral_url").unique(),
  /** Referring investor's referral code (matches another row's referral_url). */
  referralId: text("referral_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastActiveAt: timestamp("last_active_at"),
  /** When true, the investor receives saved-search and portal updates by email. */
  emailNotifications: boolean("email_notifications").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCodeHash: text("email_verification_code_hash"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  subscriptionStatus: text("subscription_status").notNull().default("inactive"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});
