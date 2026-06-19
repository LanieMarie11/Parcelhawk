"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { InvestorHeader } from "@/app/(investor)/components/investor-header";
import { LandingHeader } from "@/components/landing-header";
import { RealtorMessagesUnreadProvider } from "@/lib/realtor-messages-unread-context";

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
  const isSignUp = pathname === "/sign-up";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isSignUp || isAdmin) {
    return <>{children}</>;
  }

  const mainShellClass = isInvestor
    ? "box-border flex h-[100dvh] min-h-0 flex-col overflow-hidden pt-[73px]"
    : "flex min-h-screen flex-col pt-[73px]";
  const mainInnerClass = isInvestor
    ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
    : "flex min-h-0 flex-1 flex-col";

  if (isInvestor) {
    return (
      <RealtorMessagesUnreadProvider>
        <InvestorHeader />
        <div className={mainShellClass}>
          <div className={mainInnerClass}>{children}</div>
        </div>
      </RealtorMessagesUnreadProvider>
    );
  }

  return (
    <>
      <LandingHeader />
      <div className={mainShellClass}>
        <div className={mainInnerClass}>{children}</div>
      </div>
    </>
  );
}
