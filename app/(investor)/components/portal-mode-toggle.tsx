"use client";

import { Home, LineChart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type PortalMode = "realtor" | "investor";

function usePortalModeFromPath(): PortalMode {
  const pathname = usePathname() ?? "";
  if (pathname === "/realtor-portal" || pathname.startsWith("/realtor-portal/")) {
    return "realtor";
  }
  return "investor";
}

export function PortalModeToggle() {
  const router = useRouter();
  const activeMode = usePortalModeFromPath();

  return (
    <div
      className="flex rounded-full border border-white/20 bg-white/5 p-0.5"
      role="group"
      aria-label="Portal mode"
    >
      <button
        type="button"
        onClick={() => router.push("/realtor-portal")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          activeMode === "realtor"
            ? "bg-[#04C0AF] text-white shadow-sm"
            : "text-white/80 hover:text-white"
        }`}
      >
        <Home className="size-3.5 shrink-0" aria-hidden />
        Realtor
      </button>
      <button
        type="button"
        onClick={() => router.push("/investor-portal")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          activeMode === "investor"
            ? "bg-[#04C0AF] text-white shadow-sm"
            : "text-white/80 hover:text-white"
        }`}
      >
        <LineChart className="size-3.5 shrink-0" aria-hidden />
        Investor
      </button>
    </div>
  );
}
