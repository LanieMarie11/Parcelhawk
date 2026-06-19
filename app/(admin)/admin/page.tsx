import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    redirect("/admin/sign-in");
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 font-ibm-plex-sans md:px-10">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">
        Admin
      </p>
      <h1 className="mt-2 font-phudu text-4xl font-medium text-foreground">
        Dashboard
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Signed in as {session?.user?.email}. Stats and user tools ship in the
        next modules.
      </p>
    </div>
  );
}
