import { Copy, Link2 } from "lucide-react";

export function InviteLinkCard() {
  return (
    <section className="rounded-xl bg-[#022A43] font-ibm-plex-sans p-4 text-white shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-medium font-phudu uppercase tracking-wide">
        <Link2 className="h-4 w-4" />
        Your Invite Link
      </h2>
      <p className="mt-1 text-xs opacity-80">Share with clients to add them to your buyer pool</p>
      <div className="mt-3 flex items-center rounded-lg bg-white/10 p-1 text-xs">
        <span className="truncate px-2 text-blue-50">parcelhawk.ai/r/jamie-alvarez</span>
        <button className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25">
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold">86</p>
          <p className="text-xs text-blue-200">Joined</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">12</p>
          <p className="text-xs text-blue-200">This month</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">4</p>
          <p className="text-xs text-blue-200">Pending</p>
        </div>
      </div>
    </section>
  );
}
