import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminUserDetailView } from "./components/admin-user-detail";
import { authOptions } from "@/lib/auth";
import { getAdminUserDetail, parseAdminUserKind } from "@/lib/admin-users";

type PageProps = {
  params: Promise<{ kind: string; id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    redirect("/admin/sign-in");
  }

  const { kind: kindRaw, id } = await params;
  const kind = parseAdminUserKind(kindRaw);
  if (!kind) notFound();

  const user = await getAdminUserDetail(kind, id);
  if (!user) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 font-ibm-plex-sans md:px-10">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">
        Admin
      </p>
      <AdminUserDetailView user={user} />
    </div>
  );
}
