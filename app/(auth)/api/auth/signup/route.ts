import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { buyerInvestorLinks, investors, users } from "@/db/schema";
import { generateReferralCode } from "@/lib/referral-code";
import { eq } from "drizzle-orm";

function isPostgresUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let d = 0; d < 5 && e; d++) {
    const o = e as { code?: string; cause?: unknown };
    if (o?.code === "23505") return true;
    e = o.cause;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, role, ref } = body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
      ref?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "First name, last name, email and password are required" },
        { status: 400 }
      );
    }

    const allowedRoles = ["buyer", "investor"];
    const userRole = allowedRoles.includes(role) ? role : "buyer";
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await hash(password, 10);
    let createdId: string;

    if (userRole === "buyer") {
      const [existingBuyer] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingBuyer) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      const [createdBuyer] = await db
        .insert(users)
        .values({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: normalizedEmail,
          password: hashedPassword,
          role: userRole,
        })
        .returning({ id: users.id });
      createdId = createdBuyer.id;

      const refToken = typeof ref === "string" ? ref.trim() : "";
      if (refToken) {
        const [referrer] = await db
          .select({ id: investors.id })
          .from(investors)
          .where(eq(investors.referralUrl, refToken))
          .limit(1);
        if (referrer) {
          await db
            .update(users)
            .set({ referralId: refToken })
            .where(eq(users.id, createdId));

          await db.insert(buyerInvestorLinks).values({
            buyerId: createdId,
            investorId: referrer.id,
            status: "active",
            linkedVia: "referral_link",
          });
        }
      }
    } else {
      const [existingInvestor] = await db
        .select()
        .from(investors)
        .where(eq(investors.email, normalizedEmail))
        .limit(1);

      if (existingInvestor) {
        return NextResponse.json(
          { error: "An investor account with this email already exists" },
          { status: 409 }
        );
      }

      const maxAttempts = 8;
      let createdInvestor: { id: string; referralUrl: string | null } | undefined;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const referralCode = generateReferralCode();
        try {
          const [row] = await db
            .insert(investors)
            .values({
              firstName: normalizedFirstName,
              lastName: normalizedLastName,
              email: normalizedEmail,
              password: hashedPassword,
              referralUrl: referralCode,
            })
            .returning({ id: investors.id, referralUrl: investors.referralUrl });
          createdInvestor = row;
          break;
        } catch (err) {
          if (isPostgresUniqueViolation(err) && attempt < maxAttempts - 1) {
            continue;
          }
          throw err;
        }
      }
      if (!createdInvestor) {
        return NextResponse.json(
          { error: "Could not create referral code. Please try again." },
          { status: 500 }
        );
      }
      createdId = createdInvestor.id;

      return NextResponse.json(
        {
          message: "Account created successfully",
          userId: createdId,
          referralCode: createdInvestor.referralUrl,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: "Account created successfully", userId: createdId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
