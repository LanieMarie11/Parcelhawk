import "next-auth";

export type AppUserRole = "buyer" | "investor" | "admin";

export {};

declare module "next-auth" {
  interface User {
    id: string;
    role?: AppUserRole;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    location?: string | null;
    about?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    referralUrl?: string | null;
    subscriptionActive?: boolean;
  }

  interface Session {
    user: User & {
      id: string;
      role?: AppUserRole;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      location?: string | null;
      about?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      referralUrl?: string | null;
      subscriptionActive?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppUserRole;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    location?: string | null;
    about?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    referralUrl?: string | null;
    subscriptionActive?: boolean;
  }
}
