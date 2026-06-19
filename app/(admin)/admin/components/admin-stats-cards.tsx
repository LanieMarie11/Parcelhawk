"use client";

import { Building2, TrendingUp, UserPlus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminDashboardStats } from "@/lib/admin-stats";

export function AdminStatsCards() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const response = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = (await response.json()) as AdminDashboardStats & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load dashboard stats");
        }

        if (isMounted) {
          setStats(data);
        }
      } catch {
        if (isMounted) {
          setStats(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const cards = [
    {
      label: "Buyers",
      value: stats?.buyers ?? 0,
      subtext: "Total registered buyers",
      icon: UserRound,
    },
    {
      label: "Investors",
      value: stats?.investors ?? 0,
      subtext: "Total registered investors",
      icon: Building2,
    },
    {
      label: "Signups this week",
      value: stats?.signupsThisWeek ?? 0,
      subtext: "Buyers + investors since Monday (UTC)",
      icon: UserPlus,
    },
  ] as const;

  return (
    <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-foreground">{card.label}</p>
              <span className="rounded-md border border-border p-1 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <p className="font-phudu text-2xl font-medium leading-none text-foreground">
                {isLoading ? "..." : card.value.toLocaleString()}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-brand-green">
                <TrendingUp className="h-3 w-3" />
                {card.subtext}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
