import { MapPin, Target } from "lucide-react";

const signalDemand = [
  { name: "Road access", value: 87 },
  { name: "No flood zone", value: 74 },
  { name: "Under $80k", value: 68 },
  { name: "20+ acres", value: 52 },
  { name: "Utilities nearby", value: 41 },
  { name: "Agricultural", value: 28 },
];

const acreageDemand = [
  { name: "20 - 50 acres", value: 44 },
  { name: "50 - 100 acres", value: 28 },
  { name: "10 - 20 acres", value: 18 },
  { name: "100+ acres", value: 10 },
];

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-zinc-100">
      <div className="h-full rounded bg-linear-to-r from-teal-500 to-teal-700" style={{ width: `${value}%` }} />
    </div>
  );
}

export function DemandSidebar() {
  return (
    <aside className="space-y-4 xl:col-span-3">
      <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
          <Target className="h-4 w-4 text-[#0F172A]" />
          Property signal demand
        </h2>
        <p className="mt-2 text-xs text-zinc-500">Filters buyers apply most</p>
        <div className="mt-3 space-y-3">
          {signalDemand.map((item) => (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-[#0F172A]">{item.name}</span>
                <span className="font-medium text-[#0F172A]">{item.value}%</span>
              </div>
              <PercentBar value={item.value} />
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <h3 className="text-xs font-medium font-ibm-plex-sans uppercase tracking-wide text-[#838799]">Most Searched Acreage</h3>
          <div className="mt-3 space-y-3">
            {acreageDemand.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0F172A]">{item.name}</span>
                  <span className="font-medium text-[#0F172A]">{item.value}%</span>
                </div>
                <PercentBar value={item.value} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#0B2E48] p-4 text-white shadow-sm">
        <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-white">
          <MapPin className="h-4 w-4" />
          Your market snapshot
        </h2>
        <p className="mt-1 text-xs opacity-80">Based on your buyer&apos;s searches</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-medium">246</p>
            <p className="text-xs opacity-80">BuyersState</p>
          </div>
          <div>
            <p className="text-2xl font-medium">142</p>
            <p className="text-xs opacity-80">Searches</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed opacity-80">
          Your buyers are most active in Colorado. Road access is the deal-breaker for 87% of them. Listings under $80k with
          confirmed road access are moving fastest.
        </p>
      </section>
    </aside>
  );
}
