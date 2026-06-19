"use client";

import { usePathname } from "next/navigation";
import { AdminFooter } from "./admin-footer";
import { AdminHeader } from "./admin-header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignIn = pathname === "/admin/sign-in";

  if (isSignIn) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminHeader />
      <main className="flex flex-1 flex-col pt-[73px]">{children}</main>
      <AdminFooter />
    </div>
  );
}
