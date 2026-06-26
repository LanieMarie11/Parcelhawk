import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
import { verifyAdminCredentials } from "@/lib/admin-allowlist";
import type { AppUserRole } from "@/types/next-auth";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email?.trim() || !credentials?.password) {
          return null;
        }
        const roleRaw = (credentials as { role?: string }).role?.toLowerCase();
        const normalizedEmail = credentials.email.trim().toLowerCase();

        if (roleRaw === "admin") {
          if (!verifyAdminCredentials(normalizedEmail, credentials.password)) {
            return null;
          }
          return {
            id: `admin:${normalizedEmail}`,
            email: normalizedEmail,
            name: "Admin",
            image: null,
            role: "admin",
            firstName: "Admin",
            lastName: "",
            phone: null,
            location: null,
            about: null,
            avatarUrl: null,
            referralUrl: null,
          };
        }

        if (roleRaw !== "buyer" && roleRaw !== "investor") {
          return null;
        }

        if (roleRaw === "buyer") {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);
          if (!user) return null;
          const match = await compare(credentials.password, user.password);
          if (!match) return null;
          if (!user.emailVerified) {
            throw new Error("EmailNotVerified");
          }
          return {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
            image: null,
            role: user.role as AppUserRole,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? null,
            location: user.location ?? null,
            about: user.about ?? null,
            avatarUrl: user.avatarUrl ?? null,
            referralUrl: null,
          };
        }

        const [investor] = await db
          .select()
          .from(investors)
          .where(eq(investors.email, normalizedEmail))
          .limit(1);
        if (!investor) return null;
        const investorMatch = await compare(credentials.password, investor.password);
        if (!investorMatch) return null;

        return {
          id: investor.id,
          email: investor.email,
          name:
            [investor.firstName, investor.lastName].filter(Boolean).join(" ") ||
            investor.email,
          image: null,
          role: "investor",
          firstName: investor.firstName,
          lastName: investor.lastName,
          phone: investor.phone ?? null,
          location: investor.address ?? null,
          bio: investor.bio ?? null,
          avatarUrl: investor.avatarUrl ?? null,
          referralUrl: investor.referralUrl ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as AppUserRole | undefined;
        token.firstName = (user as { firstName?: string }).firstName;
        token.lastName = (user as { lastName?: string }).lastName;
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.location = (user as { location?: string | null }).location ?? null;
        token.about = (user as { about?: string | null }).about ?? null;
        token.bio = (user as { bio?: string | null }).bio ?? null;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
        token.referralUrl = (user as { referralUrl?: string | null }).referralUrl ?? null;
      }
      if (trigger === "update") {
        const updatedSession = (session as {
          name?: string | null;
          avatarUrl?: string | null;
          phone?: string | null;
          location?: string | null;
          about?: string | null;
          bio?: string | null;
          referralUrl?: string | null;
        } | undefined) ?? {
          name: undefined,
          avatarUrl: undefined,
          phone: undefined,
          location: undefined,
          about: undefined,
          bio: undefined,
          referralUrl: undefined,
        };

        if (updatedSession.name !== undefined) {
          token.name = updatedSession.name;
        }
        if (updatedSession.avatarUrl !== undefined) {
          token.avatarUrl = updatedSession.avatarUrl;
        }
        if (updatedSession.phone !== undefined) {
          token.phone = updatedSession.phone;
        }
        if (updatedSession.location !== undefined) {
          token.location = updatedSession.location;
        }
        if (updatedSession.about !== undefined) {
          token.about = updatedSession.about;
        }
        if (updatedSession.bio !== undefined) {
          token.bio = updatedSession.bio;
        }
        if (updatedSession.referralUrl !== undefined) {
          token.referralUrl = updatedSession.referralUrl;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
        (session.user as { role?: AppUserRole }).role = token.role as AppUserRole;
        (session.user as { firstName?: string }).firstName = token.firstName as string;
        (session.user as { lastName?: string }).lastName = token.lastName as string;
        (session.user as { phone?: string | null }).phone = token.phone ?? null;
        (session.user as { location?: string | null }).location = token.location ?? null;
        (session.user as { about?: string | null }).about = token.about ?? null;
        (session.user as { bio?: string | null }).bio = token.bio ?? null;
        (session.user as { avatarUrl?: string | null }).avatarUrl = token.avatarUrl ?? null;
        (session.user as { referralUrl?: string | null }).referralUrl = token.referralUrl ?? null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/", // or your sign-in page path
  },
  secret: process.env.NEXTAUTH_SECRET,
};
