import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
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
        if (roleRaw !== "buyer" && roleRaw !== "investor") {
          return null;
        }
        const normalizedEmail = credentials.email.trim().toLowerCase();

        if (roleRaw === "buyer") {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);
          if (!user) return null;
          const match = await compare(credentials.password, user.password);
          if (!match) return null;
          return {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
            image: null,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? null,
            location: user.location ?? null,
            avatarUrl: user.avatarUrl ?? null,
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
          avatarUrl: investor.avatarUrl ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.firstName = (user as { firstName?: string }).firstName;
        token.lastName = (user as { lastName?: string }).lastName;
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.location = (user as { location?: string | null }).location ?? null;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
      }
      if (trigger === "update") {
        const updatedSession = (session as {
          name?: string | null;
          avatarUrl?: string | null;
          phone?: string | null;
          location?: string | null;
        } | undefined) ?? {
          name: undefined,
          avatarUrl: undefined,
          phone: undefined,
          location: undefined,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { firstName?: string }).firstName = token.firstName as string;
        (session.user as { lastName?: string }).lastName = token.lastName as string;
        (session.user as { phone?: string | null }).phone = token.phone ?? null;
        (session.user as { location?: string | null }).location = token.location ?? null;
        (session.user as { avatarUrl?: string | null }).avatarUrl = token.avatarUrl ?? null;
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
