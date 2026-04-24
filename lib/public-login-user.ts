import { investors, users } from "@/db/schema";

type UserRow = typeof users.$inferSelect;
type InvestorRow = typeof investors.$inferSelect;

/** Same shape for both buyer (`users`) and investor (`investors`) in login API. */
export type PublicLoginUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  role: string;
  preferenceBudget: string | null;
  preferenceAcreage: string | null;
  preferencePurpose: string | null;
  preferenceTimeframe: string | null;
  domainLink: string | null;
  referralUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  subscriptionStatus: string;
};

export function toPublicLoginUserFromBuyer(row: UserRow): PublicLoginUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    location: row.location,
    role: row.role,
    preferenceBudget: row.preferenceBudget,
    preferenceAcreage: row.preferenceAcreage,
    preferencePurpose: row.preferencePurpose,
    preferenceTimeframe: row.preferenceTimeframe,
    domainLink: row.domainLink,
    referralUrl: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: null,
    subscriptionStatus: row.subscriptionStatus,
  };
}

export function toPublicLoginUserFromInvestor(row: InvestorRow): PublicLoginUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    location: row.address,
    role: "investor",
    preferenceBudget: null,
    preferenceAcreage: null,
    preferencePurpose: null,
    preferenceTimeframe: null,
    domainLink: null,
    referralUrl: row.referralUrl,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    subscriptionStatus: "free",
  };
}

export const signInRoles = ["buyer", "investor"] as const;
export type SignInRole = (typeof signInRoles)[number];

export function isSignInRole(value: unknown): value is SignInRole {
  return typeof value === "string" && signInRoles.includes(value as SignInRole);
}
