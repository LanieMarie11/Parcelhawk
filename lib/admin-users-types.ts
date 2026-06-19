export type AdminUserKind = "buyer" | "investor";

export type AdminUserTypeFilter = AdminUserKind | "all";

export type AdminUserListItem = {
  id: string;
  kind: AdminUserKind;
  name: string;
  email: string;
  createdAt: string;
  lastActiveAt: string | null;
  subscriptionStatus: string | null;
};

export type AdminUserListResult = {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
};

export type AdminBuyerDetail = {
  kind: "buyer";
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  about: string | null;
  avatarUrl: string | null;
  role: string;
  preferenceBudget: string | null;
  preferenceAcreage: string | null;
  preferencePurpose: string | null;
  preferenceTimeframe: string | null;
  domainLink: string | null;
  referralId: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  subscriptionStatus: string;
  emailNotifications: boolean;
};

export type AdminInvestorDetail = {
  kind: "investor";
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  bio: string | null;
  avatarUrl: string | null;
  referralUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  emailNotifications: boolean;
};

export type AdminUserDetail = AdminBuyerDetail | AdminInvestorDetail;

export function parseAdminUserKind(value: string): AdminUserKind | null {
  if (value === "buyer" || value === "investor") return value;
  return null;
}

export function parseAdminUserTypeFilter(
  value: string | null
): AdminUserTypeFilter {
  if (value === "buyer" || value === "investor") return value;
  return "all";
}

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
