import { Suspense } from "react";
import { InvestorSubscribePageClient } from "./components/investor-subscribe-page-client";

export default function InvestorSubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
          <p className="text-muted-foreground">Loading subscription...</p>
        </div>
      }
    >
      <InvestorSubscribePageClient />
    </Suspense>
  );
}
