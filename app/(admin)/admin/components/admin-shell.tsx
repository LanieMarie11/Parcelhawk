"use client";

import { usePathname } from "next/navigation";
// import { AdminFooter } from "./admin-footer";
import { AdminHeader } from "./admin-header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignIn = pathname === "/admin/sign-in";

  if (isSignIn) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <AdminHeader />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      {/* <AdminFooter /> */}
    </div>
  );
}
