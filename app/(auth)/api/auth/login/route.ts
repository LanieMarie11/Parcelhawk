import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
import {
  isSignInRole,
  toPublicLoginUserFromBuyer,
  toPublicLoginUserFromInvestor,
} from "@/lib/public-login-user";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body as {
      email: string;
      password: string;
      role?: string;
    };

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!isSignInRole(role)) {
      return NextResponse.json(
        { error: 'Role must be "buyer" or "investor"' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (role === "buyer") {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!row) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const match = await compare(password, row.password);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        message: "Signed in successfully",
        user: toPublicLoginUserFromBuyer(row),
      });
    }

    const [row] = await db
      .select()
      .from(investors)
      .where(eq(investors.email, normalizedEmail))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const match = await compare(password, row.password);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Signed in successfully",
      user: toPublicLoginUserFromInvestor(row),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
