import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { buyerInvestorLinks, viewingRequests } from "@/db/schema"

/** Listing ids the buyer has viewing requests for with their active linked realtor. */
export async function getBuyerViewingRequestListingIds(
  buyerId: string,
  listingIds: number[]
): Promise<Set<number>> {
  const result = new Set<number>()
  if (listingIds.length === 0) return result

  const [linkRow] = await db
    .select({ investorId: buyerInvestorLinks.investorId })
    .from(buyerInvestorLinks)
    .where(
      and(
        eq(buyerInvestorLinks.buyerId, buyerId),
        eq(buyerInvestorLinks.status, "active"),
        eq(buyerInvestorLinks.realtorFlag, "active")
      )
    )
    .orderBy(desc(buyerInvestorLinks.linkedAt))
    .limit(1)

  const realtorId = linkRow?.investorId
  if (!realtorId) return result

  const viewingRows = await db
    .select({ listingId: viewingRequests.listingId })
    .from(viewingRequests)
    .where(
      and(
        eq(viewingRequests.buyerId, buyerId),
        eq(viewingRequests.realtorId, realtorId),
        inArray(viewingRequests.listingId, listingIds)
      )
    )

  for (const row of viewingRows) {
    result.add(row.listingId)
  }

  return result
}
