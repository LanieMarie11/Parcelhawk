import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminUsersTable } from "./components/admin-users-table";
import { authOptions } from "@/lib/auth";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    redirect("/admin/sign-in");
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 font-ibm-plex-sans md:px-10">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">
        Admin
      </p>
      <h1 className="mt-2 font-phudu text-4xl font-medium text-foreground">
        Users
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Search buyers and investors. Click a row to open a read-only profile.
      </p>

      <Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">Loading users…</p>}>
        <AdminUsersTable />
      </Suspense>
    </div>
  );
}
