import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
    referralUrl?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      role?: string;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      location?: string | null;
      avatarUrl?: string | null;
      referralUrl?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
    referralUrl?: string | null;
  }
}
