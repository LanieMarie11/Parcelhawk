import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { investors, users } from "@/db/schema";
import { LAST_ACTIVE_THROTTLE_MS } from "@/lib/last-active-constants";

/**
 * Sets lastActiveAt only if the row is stale — cheap no-op when recently updated
 * (e.g. parallel requests without the throttle cookie yet).
 */
export async function touchLastActiveIfStale(
  userId: string,
  role: string
): Promise<void> {
  if (role === "admin") {
    return;
  }

  const threshold = new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS);

  if (role === "investor") {
    await db
      .update(investors)
      .set({ lastActiveAt: new Date() })
      .where(
        and(
          eq(investors.id, userId),
          or(
            isNull(investors.lastActiveAt),
            lt(investors.lastActiveAt, threshold)
          )
        )
      );
    return;
  }

  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        or(isNull(users.lastActiveAt), lt(users.lastActiveAt, threshold))
      )
    );
}
