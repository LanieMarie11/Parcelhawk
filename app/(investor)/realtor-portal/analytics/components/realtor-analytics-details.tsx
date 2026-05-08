import { Clock3, MessageCircle, PhoneCall, Target } from "lucide-react";

const trendLegend = [
  { label: "Searches", color: "bg-zinc-600" },
  { label: "Saves", color: "bg-lime-500" },
  { label: "Viewing Requests", color: "bg-sky-500" },
  { label: "Messages", color: "bg-emerald-500" },
];

const intentItems = [
  { label: "Hot", value: 42, color: "bg-red-500" },
  { label: "Warm", value: 42, color: "bg-amber-500" },
  { label: "Cold", value: 42, color: "bg-sky-500" },
  { label: "Viewing Request", value: 42, color: "bg-emerald-500" },
];

const funnelRows = [
  { label: "Pushed", value: 245, width: 100, color: "bg-teal-700", percent: null },
  { label: "Opened", value: 187, width: 72, color: "bg-teal-500", percent: 72 },
  { label: "Saved", value: 124, width: 60, color: "bg-teal-400", percent: 60 },
  { label: "Viewing Requested", value: 56, width: 47, color: "bg-teal-300", percent: 47 },
  { label: "No Response", value: 189, width: 33, color: "bg-teal-200", percent: 33 },
];

export function RealtorAnalyticsDetails() {
  return (
    <section className="mt-3 grid gap-3 xl:grid-cols-12">
      <div className="space-y-3 xl:col-span-9">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[22px] font-medium font-phudu uppercase tracking-tight text-[#182231]">
            Buyer Engagement Trends
          </h3>
          <p className="text-xs text-zinc-500">
            Analyze buyer activity trends to understand interest and conversion patterns.
          </p>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <svg viewBox="0 0 760 230" className="h-[210px] w-full text-zinc-300">
              <line x1="40" y1="15" x2="40" y2="190" stroke="currentColor" strokeWidth="1" />
              <line x1="40" y1="190" x2="735" y2="190" stroke="currentColor" strokeWidth="1" />

              <line x1="40" y1="145" x2="735" y2="145" stroke="currentColor" strokeWidth="0.8" />
              <line x1="40" y1="100" x2="735" y2="100" stroke="currentColor" strokeWidth="0.8" />
              <line x1="40" y1="55" x2="735" y2="55" stroke="currentColor" strokeWidth="0.8" />

              <line x1="270" y1="15" x2="270" y2="190" stroke="#d4d4d8" strokeDasharray="4 4" />

              <polyline fill="none" stroke="#52525b" strokeWidth="2" points="40,165 270,140 500,145 735,135" />
              <polyline fill="none" stroke="#84cc16" strokeWidth="2" points="40,130 270,105 500,110 735,80" />
              <polyline fill="none" stroke="#0ea5e9" strokeWidth="2" points="40,95 270,90 500,85 735,78" />
              <polyline fill="none" stroke="#22c55e" strokeWidth="2" points="40,60 270,40 500,55 735,45" />

              <circle cx="270" cy="140" r="3" fill="#52525b" />
              <circle cx="270" cy="105" r="3" fill="#84cc16" />
              <circle cx="270" cy="90" r="3" fill="#0ea5e9" />
              <circle cx="270" cy="40" r="3" fill="#22c55e" />

              <text x="24" y="191" fontSize="11" fill="#71717a">
                0
              </text>
              <text x="16" y="148" fontSize="11" fill="#71717a">
                90
              </text>
              <text x="12" y="103" fontSize="11" fill="#71717a">
                180
              </text>
              <text x="12" y="58" fontSize="11" fill="#71717a">
                270
              </text>
              <text x="8" y="18" fontSize="11" fill="#71717a">
                360
              </text>

              <text x="22" y="210" fontSize="11" fill="#71717a">
                Week 1
              </text>
              <text x="252" y="210" fontSize="11" fill="#71717a">
                Week 2
              </text>
              <text x="482" y="210" fontSize="11" fill="#71717a">
                Week 3
              </text>
              <text x="712" y="210" fontSize="11" textAnchor="end" fill="#71717a">
                Week 4
              </text>
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-sm">
            {trendLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-zinc-600">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[22px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Parcel Push Funnel</h3>
          <p className="text-xs text-zinc-500">This month pushed parcel</p>

          <div className="mt-4 space-y-4">
            {funnelRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[84px_1fr_42px] items-center gap-3 text-xs">
                <span className="font-medium text-zinc-700">{row.label}</span>
                <div className="relative h-5 rounded bg-zinc-100">
                  <div className={`h-5 rounded ${row.color}`} style={{ width: `${row.width}%` }}>
                    {row.percent !== null ? (
                      <span className="mr-2 flex h-full items-center justify-end text-[10px] font-semibold text-white">
                        {row.percent}%
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-right text-zinc-600">{row.value}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <aside className="space-y-3 xl:col-span-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[22px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Buyer Intent Breakdown</h3>

          <div className="mt-3 flex justify-center">
            <div className="relative h-48 w-48 rounded-full bg-[conic-gradient(#ef4444_0deg_140deg,#eab308_140deg_215deg,#0ea5e9_215deg_300deg,#22c55e_300deg_360deg)]">
              <div className="absolute inset-4 rounded-full bg-white" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 p-3 text-sm">
            {intentItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
                <span className="font-semibold text-zinc-800">{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[22px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Outreach Performance</h3>

          <div className="mt-3 rounded-lg border border-zinc-200 p-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Messages Sent
                </p>
                <p className="text-xl font-semibold text-zinc-900">152</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Target className="h-3.5 w-3.5" />
                  Reply Rate
                </p>
                <p className="text-xl font-semibold text-zinc-900">64%</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Avg Response Time
                </p>
                <p className="text-xl font-semibold text-zinc-900">2.3 HRS</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Best Contact Window
                </p>
                <p className="text-xl font-semibold text-zinc-900">SUN 07:05 PM</p>
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  );
}
