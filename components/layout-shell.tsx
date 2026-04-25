"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { InvestorHeader } from "@/app/(investor)/components/investor-header";
import { LandingHeader } from "@/components/landing-header";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isInvestor = status === "authenticated" && role === "investor";

  useEffect(() => {
    const user = session?.user as
      | { id?: string; email?: string | null; role?: string }
      | undefined;
    // Dev: open DevTools → Console to verify auth role and header branch
    console.log("[LayoutShell] session debug", {
      status,
      role: role ?? "(undefined)",
      isInvestor,
      userId: user?.id,
      email: user?.email,
      pathname,
    });
  }, [session, status, role, isInvestor, pathname]);
  const investorPortalActive =
    pathname === "/realtor-portal" || pathname.startsWith("/realtor-portal/");

  const isSignUp = pathname === "/sign-up";

  if (isSignUp) {
    return <>{children}</>;
  }

  return (
    <>
      {isInvestor ? (
        <InvestorHeader activeMode={investorPortalActive ? "investor" : "realtor"} />
      ) : (
        <LandingHeader />
      )}
      <div className="flex min-h-screen flex-col pt-[73px]">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </>
  );
}
