import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, role } = body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
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
      const [createdInvestor] = await db
      .insert(investors)
      .values({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password: hashedPassword,
      })
      .returning({ id: investors.id });
      createdId = createdInvestor.id;
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
