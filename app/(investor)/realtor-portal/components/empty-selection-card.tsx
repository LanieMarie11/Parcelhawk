import { UserRound } from "lucide-react";

export function EmptySelectionCard() {
  return (
    <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
        <UserRound className="h-5 w-5 text-zinc-500" />
      </div>
      <h2 className="mt-3 text-sm font-phudu font-semibold uppercase tracking-wide text-[#0F172A]">
        No Buyer Selected
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Select any buyer from the table to view profile and activity details here.
      </p>
    </section>
  );
}
