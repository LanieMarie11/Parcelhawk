import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
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

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const allowedRoles = ["buyer", "investor"];
    const userRole = allowedRoles.includes(role) ? role : "buyer";

    const hashedPassword = await hash(password, 10);

    const [created] = await db
      .insert(users)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
      })
      .returning({ id: users.id });

    return NextResponse.json(
      { message: "Account created successfully", userId: created.id },
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
