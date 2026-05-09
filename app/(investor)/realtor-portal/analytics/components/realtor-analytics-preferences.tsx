import { Clock3, DollarSign, FileText, Link2, LocateFixed, Maximize2, UserCheck, UserPlus } from "lucide-react";

const preferenceGroups = [
  {
    title: "Top Searched States",
    icon: LocateFixed,
    rows: [
      { label: "#1. Colorado", value: 245, width: 100 },
      { label: "#2. Montana", value: 156, width: 64 },
      { label: "#3. Wyoming", value: 122, width: 50 },
      { label: "#4. Idaho", value: 101, width: 41 },
    ],
  },
  {
    title: "Top Acreage Ranges",
    icon: Maximize2,
    rows: [
      { label: "20-50 acres", value: 245, width: 100 },
      { label: "10-20 acres", value: 156, width: 64 },
      { label: "0-10 acres", value: 122, width: 50 },
      { label: "50-100 acres", value: 101, width: 41 },
    ],
  },
  {
    title: "Top Price Bands",
    icon: DollarSign,
    rows: [
      { label: "$50k-$100k", value: 245, width: 100 },
      { label: "$100k-$250k", value: 156, width: 64 },
      { label: "Under $50k", value: 122, width: 50 },
      { label: "$250k-$500k", value: 101, width: 41 },
    ],
  },
  {
    title: "Top Parcel Attributes",
    icon: FileText,
    rows: [
      { label: "Road Access", value: "87%", width: 87 },
      { label: "Recreational", value: "77%", width: 77 },
      { label: "Utilities Nearby", value: "67%", width: 67 },
      { label: "Mixed-Use", value: "47%", width: 47 },
    ],
  },
];

const highestIntentBuyers = [
  { name: "Marcus Reed", joined: "Joined Mar 2026", lastActive: "12 min ago", searches: 47, saves: 47, requests: 47 },
  { name: "Sarah Alcott", joined: "Joined Mar 2026", lastActive: "1h ago", searches: 47, saves: 31, requests: 47 },
  { name: "Jen Larimore", joined: "Joined Mar 2026", lastActive: "4h ago", searches: 47, saves: 18, requests: 47 },
  { name: "Hannah Weiss", joined: "Joined Mar 2026", lastActive: "Yesterday", searches: 47, saves: 12, requests: 47 },
];

const inviteStats = [
  { label: "Invite Link Clicks", value: 245, icon: Link2, color: "bg-sky-100 text-sky-600" },
  { label: "Active Invited Buyers", value: 68, icon: UserPlus, color: "bg-sky-100 text-sky-600" },
  { label: "Buyers Joined", value: 87, icon: UserCheck, color: "bg-emerald-100 text-emerald-600" },
  { label: "Pending Invites", value: 19, icon: Clock3, color: "bg-lime-100 text-lime-600" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function RealtorAnalyticsPreferences() {
  return (
    <section className="mt-3 space-y-3">
      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Buyer Preference Insights</h3>
        <p className="text-xs font-ibm-plex-sans font-regular text-zinc-500">
          Explore buyer intent and engagement insights to support smarter decisions.
        </p>

        <div className="mt-3 grid gap-3 xl:grid-cols-4">
          {preferenceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.title}
                className="rounded-lg border border-zinc-200 bg-linear-to-b from-[#E6F6FD] to-[#FFFFFF] p-3"
              >
                <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#FFFFFF] text-[#484A54]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-lg font-ibm-plex-sans font-medium text-zinc-700">{group.title}</p>
                </div>

                <div className="mt-3 space-y-3">
                  {group.rows.map((row) => (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-zinc-700">
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                      <div className="h-1.5 rounded bg-zinc-200">
                        <div className="h-1.5 rounded bg-sky-500" style={{ width: `${row.width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="grid gap-3 xl:grid-cols-12">
        <article className="rounded-xl border border-zinc-200 bg-white p-4 xl:col-span-9">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Highest Intent Buyers</h3>
          <p className="text-xs font-ibm-plex-sans font-regular text-zinc-500">
            Analyze buyer intent signals to focus on the most valuable opportunities.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-t border-zinc-200 bg-[#FAFBFC] text-[#030303]">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Buyer</th>
                  <th className="py-2 pr-3 font-semibold">Last active</th>
                  <th className="py-2 pr-3 font-semibold">Searches</th>
                  <th className="py-2 pr-3 font-semibold">Saves Properties</th>
                  <th className="py-2 pr-3 font-semibold">Viewing Requests</th>
                  <th className="py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {highestIntentBuyers.map((buyer) => (
                  <tr key={buyer.name} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700">
                          {initials(buyer.name)}
                        </span>
                        <div>
                          <p className="font-semibold text-zinc-800">{buyer.name}</p>
                          <p className="text-[11px] text-zinc-500">{buyer.joined}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-500">{buyer.lastActive}</td>
                    <td className="py-2.5 pr-3 text-zinc-700">{buyer.searches}</td>
                    <td className="py-2.5 pr-3 text-zinc-700">{buyer.saves}</td>
                    <td className="py-2.5 pr-3 text-zinc-700">{buyer.requests}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        className="rounded-md bg-emerald-800 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-emerald-900"
                      >
                        Contact Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 xl:col-span-3">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#0F172A]">Invite & Referral Analytics</h3>

          <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 p-3">
            {inviteStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-ibm-plex-sans font-regular text-zinc-500">{item.label}</p>
                    <p className="text-[20px] font-medium font-phudu leading-none text-zinc-900">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
