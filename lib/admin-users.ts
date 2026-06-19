import { desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
import type {
  AdminUserDetail,
  AdminUserKind,
  AdminUserListItem,
  AdminUserListResult,
  AdminUserTypeFilter,
} from "@/lib/admin-users-types";

export type {
  AdminBuyerDetail,
  AdminInvestorDetail,
  AdminUserDetail,
  AdminUserKind,
  AdminUserListItem,
  AdminUserListResult,
  AdminUserTypeFilter,
} from "@/lib/admin-users-types";

export {
  formatAdminDate,
  parseAdminUserKind,
  parseAdminUserTypeFilter,
} from "@/lib/admin-users-types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function buildNameSearch(table: typeof users | typeof investors, query: string): SQL {
  const pattern = `%${query.trim()}%`;
  return or(
    ilike(table.firstName, pattern),
    ilike(table.lastName, pattern),
    ilike(table.email, pattern)
  )!;
}

function mapBuyerRow(row: typeof users.$inferSelect): AdminUserListItem {
  return {
    id: row.id,
    kind: "buyer",
    name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: toIso(row.lastActiveAt),
    subscriptionStatus: row.subscriptionStatus,
  };
}

function mapInvestorRow(row: typeof investors.$inferSelect): AdminUserListItem {
  return {
    id: row.id,
    kind: "investor",
    name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: toIso(row.lastActiveAt ?? row.lastLoginAt),
    subscriptionStatus: null,
  };
}

export async function listAdminUsers(options: {
  q?: string;
  type?: AdminUserTypeFilter;
  page?: number;
  limit?: number;
}): Promise<AdminUserListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const type = options.type ?? "all";
  const query = options.q?.trim() ?? "";

  const buyerWhere = query ? buildNameSearch(users, query) : undefined;
  const investorWhere = query ? buildNameSearch(investors, query) : undefined;

  const [buyerRows, investorRows] = await Promise.all([
    type === "investor"
      ? Promise.resolve([])
      : db
          .select()
          .from(users)
          .where(buyerWhere)
          .orderBy(desc(users.createdAt)),
    type === "buyer"
      ? Promise.resolve([])
      : db
          .select()
          .from(investors)
          .where(investorWhere)
          .orderBy(desc(investors.createdAt)),
  ]);

  const merged = [
    ...buyerRows.map(mapBuyerRow),
    ...investorRows.map(mapInvestorRow),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = merged.length;
  const offset = (page - 1) * limit;

  return {
    users: merged.slice(offset, offset + limit),
    total,
    page,
    limit,
  };
}

export async function getAdminUserDetail(
  kind: AdminUserKind,
  id: string
): Promise<AdminUserDetail | null> {
  if (kind === "buyer") {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) return null;

    return {
      kind: "buyer",
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      location: row.location,
      about: row.about,
      avatarUrl: row.avatarUrl,
      role: row.role,
      preferenceBudget: row.preferenceBudget,
      preferenceAcreage: row.preferenceAcreage,
      preferencePurpose: row.preferencePurpose,
      preferenceTimeframe: row.preferenceTimeframe,
      domainLink: row.domainLink,
      referralId: row.referralId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastActiveAt: toIso(row.lastActiveAt),
      subscriptionStatus: row.subscriptionStatus,
      emailNotifications: row.emailNotifications,
    };
  }

  const [row] = await db
    .select()
    .from(investors)
    .where(eq(investors.id, id))
    .limit(1);
  if (!row) return null;

  return {
    kind: "investor",
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    referralUrl: row.referralUrl,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: toIso(row.lastLoginAt),
    lastActiveAt: toIso(row.lastActiveAt),
    emailNotifications: row.emailNotifications,
  };
}
