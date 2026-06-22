"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  formatAdminDate,
  type AdminUserListItem,
  type AdminUserListResult,
  type AdminUserTypeFilter,
} from "@/lib/admin-users-types";

function kindLabel(kind: AdminUserListItem["kind"]): string {
  return kind === "buyer" ? "Buyer" : "Investor";
}

function kindBadgeClass(kind: AdminUserListItem["kind"]): string {
  return kind === "buyer"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-sky-50 text-sky-700 border-sky-200";
}

export function AdminUsersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AdminUserListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const type = (searchParams.get("type") ?? "all") as AdminUserTypeFilter;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/users?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type !== "all") params.set("type", type);
      params.set("page", String(page));

      try {
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load users");
        }
        const json = (await response.json()) as AdminUserListResult;
        if (isMounted) setData(json);
      } catch {
        if (isMounted) {
          setError("Could not load users. Please try again.");
          setData(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [q, type, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: searchInput.trim() || null, page: "1" });
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or email…"
            className="w-full max-w-md rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover"
          >
            Search
          </button>
        </form>

        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[#373940]">
          <span className="text-muted-foreground">Type:</span>
          <select
            value={type}
            onChange={(event) =>
              updateParams({
                type: event.target.value === "all" ? null : event.target.value,
                page: "1",
              })
            }
            className="bg-transparent text-sm outline-none"
          >
            <option value="all">All users</option>
            <option value="buyer">Buyers only</option>
            <option value="investor">Investors only</option>
          </select>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-phudu text-md font-medium uppercase tracking-wide text-foreground">
            Users
          </h2>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${data?.total ?? 0} total · page ${data?.page ?? page} of ${totalPages}`}
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    Loading users…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-6 text-destructive" colSpan={6}>
                    {error}
                  </td>
                </tr>
              ) : !data?.users.length ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                    No users match your search.
                  </td>
                </tr>
              ) : (
                data.users.map((user) => (
                  <tr
                    key={`${user.kind}-${user.id}`}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.kind}/${user.id}`}
                        className="font-medium text-foreground hover:text-brand-green"
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${kindBadgeClass(user.kind)}`}
                      >
                        {kindLabel(user.kind)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAdminDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAdminDate(user.lastActiveAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.subscriptionStatus ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !error && totalPages > 1 ? (
          <footer className="flex items-center justify-between border-t border-border px-4 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
