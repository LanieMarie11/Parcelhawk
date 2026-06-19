import { gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { investors, users } from "@/db/schema";

export type AdminDashboardStats = {
  buyers: number;
  investors: number;
  signupsThisWeek: number;
};

/** Monday 00:00:00 UTC for the current calendar week. */
export function getStartOfWeekUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday
    )
  );
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const weekStart = getStartOfWeekUtc();

  const [buyersRow, investorsRow, buyerSignupsRow, investorSignupsRow] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(investors),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, weekStart)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(investors)
        .where(gte(investors.createdAt, weekStart)),
    ]);

  return {
    buyers: buyersRow[0]?.count ?? 0,
    investors: investorsRow[0]?.count ?? 0,
    signupsThisWeek:
      (buyerSignupsRow[0]?.count ?? 0) + (investorSignupsRow[0]?.count ?? 0),
  };
}
