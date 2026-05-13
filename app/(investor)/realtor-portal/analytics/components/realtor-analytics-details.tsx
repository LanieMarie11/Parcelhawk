import { Clock3, MessageCircle, PhoneCall, Target } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buyerIntentScore } from "@/lib/buyer-intent-score";

const trendLegend = [
  { label: "Searches", color: "bg-zinc-600" },
  { label: "Saves", color: "bg-lime-500" },
  { label: "Viewing Requests", color: "bg-sky-500" },
  { label: "Messages", color: "bg-emerald-500" },
];

type AnalyticsSummaryBuyer = {
  id: string;
  lastActiveAt: string;
  viewingRequestCount: number;
};

type RealtorAnalyticsDetailsProps = {
  buyers: AnalyticsSummaryBuyer[];
  isLoading: boolean;
  viewingRequestCount: number;
  trendData: WeeklyTrendPoint[];
};

type WeeklyTrendPoint = {
  week: string;
  searches: number;
  saves: number;
  viewingRequests: number;
  messages: number;
};

const funnelRows = [
  { label: "Pushed", value: 245, width: 100, color: "bg-teal-700", percent: null },
  { label: "Opened", value: 187, width: 72, color: "bg-teal-500", percent: 72 },
  { label: "Saved", value: 124, width: 60, color: "bg-teal-400", percent: 60 },
  { label: "Viewing Requested", value: 56, width: 47, color: "bg-teal-300", percent: 47 },
  { label: "No Response", value: 189, width: 33, color: "bg-teal-200", percent: 33 },
];
export function RealtorAnalyticsDetails({ buyers, isLoading, viewingRequestCount, trendData }: RealtorAnalyticsDetailsProps) {
  let hot = 0;
  let warm = 0;
  let cold = 0;

  for (const buyer of buyers) {
    const score = buyerIntentScore({
      lastActiveAt: buyer.lastActiveAt,
      hasViewingRequest: viewingRequestCount > 0,
    });
    if (score === "hot") hot += 1;
    else if (score === "warm") warm += 1;
    else cold += 1;
  }

  const display = (n: number) => (isLoading ? "-" : n.toString());

  const intentDefinition = [
    { label: "Hot", count: hot, dotClass: "bg-red-500", hex: "#ef4444" },
    { label: "Warm", count: warm, dotClass: "bg-amber-500", hex: "#f59e0b" },
    { label: "Cold", count: cold, dotClass: "bg-sky-500", hex: "#0ea5e9" },
    {
      label: "Viewing Request",
      count: viewingRequestCount,
      dotClass: "bg-emerald-500",
      hex: "#10b981",
    },
  ] as const;

  const intentItems = intentDefinition.map((row) => ({
    label: row.label,
    value: display(row.count),
    color: row.dotClass,
  }));

  /** Same logic as former conic-gradient: loading / zero total → zinc ring; else positive slices only. */
  const intentDonutPieData = (() => {
    if (isLoading) {
      return [{ name: "loading", count: 1, fill: "#e4e4e7" }];
    }
    const total = intentDefinition.reduce((sum, row) => sum + row.count, 0);
    if (total === 0) {
      return [{ name: "empty", count: 1, fill: "#e4e4e7" }];
    }
    const positive = intentDefinition.filter((row) => row.count > 0);
    if (positive.length === 0) {
      return [{ name: "empty", count: 1, fill: "#e4e4e7" }];
    }
    return positive.map((row) => ({
      name: row.label,
      count: row.count,
      fill: row.hex,
    }));
  })();

  const chartData = trendData.length > 0
    ? trendData
    : [
        { week: "Week 1", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
        { week: "Week 2", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
        { week: "Week 3", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
        { week: "Week 4", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
      ];

  return (
    <section className="mt-3 grid gap-3 xl:grid-cols-12">
      <div className="space-y-3 xl:col-span-9">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">
            Buyer Engagement Trends
          </h3>
          <p className="text-xs font-ibm-plex-sans text-zinc-500">
            Analyze buyer activity trends to understand interest and conversion patterns.
          </p>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="#d4d4d8" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#e4e4e7",
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="searches" stroke="#52525b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saves" stroke="#84cc16" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="viewingRequests" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="messages" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-sm">
            {trendLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-zinc-600">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />
                <span className="text-[16px] font-ibm-plex-sans">{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Parcel Push Funnel</h3>
          <p className="text-xs font-regular font-ibm-plex-sans text-zinc-500">This month pushed parcel</p>
          <hr className="mt-3 -mx-4 w-[calc(100%+2rem)] max-w-none border-0 border-t border-zinc-200" />

          <div className="mt-4 space-y-4">
            {funnelRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[84px_1fr_42px] items-center gap-3 text-xs">
                <span className="text-xs font-medium text-[#0F172A]">{row.label}</span>
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
            <div className="h-48 w-48">
              <PieChart width={192} height={192} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={intentDonutPieData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={96}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={!isLoading}
                >
                  {intentDonutPieData.map((entry, index) => (
                    <Cell key={`intent-slice-${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 p-3 text-sm">
            {intentItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center text-xs font-medium font-ibm-plex-sans gap-1.5 text-zinc-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
                <span className="font-semibold text-zinc-800">{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Outreach Performance</h3>

          <div className="mt-3 rounded-lg border border-zinc-200 p-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Messages Sent
                </p>
                <p className="text-md font-medium text-zinc-900">152</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Target className="h-3.5 w-3.5" />
                  Reply Rate
                </p>
                <p className="text-md font-medium text-zinc-900">64%</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Avg Response Time
                </p>
                <p className="text-md font-medium text-zinc-900">2.3 HRS</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Best Contact Window
                </p>
                <p className="text-md font-medium text-zinc-900">SUN 07:05 PM</p>
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  );
}
