import Link from "next/link";
import {
  formatAdminDate,
  type AdminUserDetail,
} from "@/lib/admin-users-types";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-phudu text-lg font-medium text-foreground">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export function AdminUserDetailView({ user }: { user: AdminUserDetail }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/users"
          className="text-sm font-medium text-brand-green hover:text-brand-green-hover"
        >
          ← Back to users
        </Link>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            user.kind === "buyer"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          {user.kind === "buyer" ? "Buyer" : "Investor"}
        </span>
      </div>

      <div>
        <h1 className="font-phudu text-3xl font-medium text-foreground">
          {fullName || user.email}
        </h1>
        <p className="mt-1 text-muted-foreground">{user.email}</p>
      </div>

      <DetailSection title="Contact">
        <DetailField label="Phone" value={user.phone} />
        {user.kind === "buyer" ? (
          <DetailField label="Location" value={user.location} />
        ) : (
          <DetailField label="Address" value={user.address} />
        )}
        <DetailField
          label="Email notifications"
          value={user.emailNotifications ? "Enabled" : "Disabled"}
        />
      </DetailSection>

      <DetailSection title="Activity">
        <DetailField label="Joined" value={formatAdminDate(user.createdAt)} />
        <DetailField
          label="Last active"
          value={formatAdminDate(user.lastActiveAt)}
        />
        {user.kind === "buyer" ? (
          <DetailField label="Updated" value={formatAdminDate(user.updatedAt)} />
        ) : (
          <DetailField
            label="Last login"
            value={formatAdminDate(user.lastLoginAt)}
          />
        )}
        {user.kind === "buyer" ? (
          <DetailField label="Subscription" value={user.subscriptionStatus} />
        ) : null}
      </DetailSection>

      {user.kind === "buyer" ? (
        <>
          <DetailSection title="Preferences">
            <DetailField label="Budget" value={user.preferenceBudget} />
            <DetailField label="Acreage" value={user.preferenceAcreage} />
            <DetailField label="Purpose" value={user.preferencePurpose} />
            <DetailField label="Timeframe" value={user.preferenceTimeframe} />
          </DetailSection>

          <DetailSection title="Account">
            <DetailField label="Role" value={user.role} />
            <DetailField label="Referral ID" value={user.referralId} />
            <DetailField label="Domain link" value={user.domainLink} />
            <DetailField label="About" value={user.about} />
          </DetailSection>
        </>
      ) : (
        <DetailSection title="Account">
          <DetailField label="Referral URL" value={user.referralUrl} />
          <DetailField label="Bio" value={user.bio} />
        </DetailSection>
      )}
    </div>
  );
}
