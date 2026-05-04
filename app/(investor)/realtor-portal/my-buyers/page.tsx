"use client";

import { useMemo, useState } from "react";

import { BuyerDetailMain } from "./components/buyer-detail-main";
import { BuyersListSidebar } from "./components/buyers-list-sidebar";
import type { ActivityRow, BuyerDetail, SavedPropertyRow } from "./components/types";

const BUYERS: BuyerDetail[] = [
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    locationSubtitle: "California · 12 min ago",
    lastSeen: "12 min ago",
    email: "marcus.chen@email.com",
    phone: "(415) 555-0192",
    location: "San Francisco Bay Area",
    priority: 94,
    stats: { searches: 47, scheduled: 47, unread: 47 },
    filters: ["$500K - $900K", "Henry County, Weakley County", "20+ ac"],
    savedProperties: [
      {
        id: "1",
        label: "Aisha Patel",
        subtitle: "California · 4h ago",
        price: "$420K",
        status: "Viewing pending",
      },
      {
        id: "2",
        label: "Highway 1495 West",
        subtitle: "Weakley County, TN · 1d ago",
        price: "$510K",
        status: "Saved",
      },
      {
        id: "3",
        label: "Brushy Creek Parcel",
        subtitle: "Henry County, TN · 2d ago",
        price: "$680K",
        status: "Viewing pending",
      },
    ],
    activity: [
      {
        id: "a1",
        kind: "viewed",
        text: "Requested viewing for 1495 Highway 140 West",
        when: "12 min ago",
      },
      {
        id: "a2",
        kind: "saved",
        text: "Saved listing — Oak Ridge Acreage, 52 ac",
        when: "2h ago",
      },
      {
        id: "a3",
        kind: "searched",
        text: "Ran search · Henry County · 500K budget",
        when: "5h ago",
      },
      {
        id: "a4",
        kind: "viewed",
        text: "Viewed curated parcel invite from realtor",
        when: "1d ago",
      },
    ],
  },
  {
    id: "sofia-martinez",
    name: "Sofia Martinez",
    locationSubtitle: "Texas · 42 min ago",
    lastSeen: "42 min ago",
    email: "sofia.m@email.com",
    phone: "(512) 555-0148",
    location: "Austin Metro",
    priority: 88,
    stats: { searches: 32, scheduled: 12, unread: 5 },
    filters: ["$300K - $650K", "Travis County", "12+ ac"],
    savedProperties: [
      {
        id: "sp1",
        label: "Hill Country Lot",
        subtitle: "Travis County · 8h ago",
        price: "$395K",
        status: "Saved",
      },
    ],
    activity: [
      {
        id: "b1",
        kind: "searched",
        text: "Ran search · river access · wooded",
        when: "1h ago",
      },
    ],
  },
  {
    id: "aisha-patel",
    name: "Aisha Patel",
    locationSubtitle: "Georgia · 1h ago",
    lastSeen: "1h ago",
    email: "aisha.p@gmail.com",
    phone: "(404) 555-0109",
    location: "Atlanta Region",
    priority: 71,
    stats: { searches: 61, scheduled: 8, unread: 12 },
    filters: ["$400K+", "Metro Atlanta", "Any acreage"],
    savedProperties: [],
    activity: [
      {
        id: "c1",
        kind: "saved",
        text: "Saved 2 parcels north of Canton",
        when: "45 min ago",
      },
    ],
  },
  ...[
    ["Liam O'Connor", "Colorado · 3h ago", 65],
    ["Noah Kim", "Washington · 30 min ago", 82],
    ["Emma Dubois", "Louisiana · 6h ago", 58],
    ["Carlos Gomez", "Florida · 55 min ago", 76],
    ["Nia Johnson", "Ohio · 90 min ago", 69],
    ["Yuki Tanaka", "Oregon · 4h ago", 73],
  ].map(([name, sub, prio], idx) => {
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return {
      id: `${slug}-${idx}`,
      name: String(name),
      locationSubtitle: String(sub),
      lastSeen: String(sub).split("·")[1]?.trim() ?? "",
      email: `${slug}@example.com`,
      phone: "(555) 555-0100",
      location: "United States",
      priority: prio as number,
      stats: { searches: 20 + idx * 3, scheduled: 5 + idx, unread: 2 + idx },
      filters: ["$250K - $750K", "Multi-county"],
      savedProperties: [] as SavedPropertyRow[],
      activity: [] as ActivityRow[],
    } satisfies BuyerDetail;
  }),
];

export default function MyBuyersPage() {
  const [selectedId, setSelectedId] = useState(BUYERS[0]!.id);
  const [search, setSearch] = useState("");

  const filteredBuyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BUYERS;
    return BUYERS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q),
    );
  }, [search]);

  const selected =
    filteredBuyers.find((b) => b.id === selectedId) ?? filteredBuyers[0] ?? BUYERS[0]!;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-10 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-6">
        <BuyersListSidebar
          buyers={filteredBuyers}
          selectedId={selected.id}
          onSelectId={setSelectedId}
        />
        <BuyerDetailMain selected={selected} search={search} onSearchChange={setSearch} />
      </div>
    </div>
  );
}
