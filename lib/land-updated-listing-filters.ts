import { sql } from "drizzle-orm";
import { mergedListings } from "@/db/schema";

export function jsonbArrayContains(
  column: typeof mergedListings.activities | typeof mergedListings.propertyType,
  value: string
) {
  return sql`${column} @> ${JSON.stringify([value])}::jsonb`;
}

export function jsonbArrayFirst(value: unknown): string | undefined {
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
