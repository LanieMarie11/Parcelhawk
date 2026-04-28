import { SlidersHorizontal, UsersRound } from "lucide-react";

type BuyerThread = {
  id: string;
  name: string;
  preview: string;
  unread?: boolean;
  active?: boolean;
  avatarUrl: string;
};

type ChatMessage = {
  id: string;
  sender: "buyer" | "agent";
  text: string;
  avatarUrl?: string;
};

const buyerThreads: readonly BuyerThread[] = [
  {
    id: "marcus-chen",
    name: "MARCUS CHEN",
    preview: "Thanks! I will check those out.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=12",
  },
  {
    id: "sofia-martinez",
    name: "SOFIA MARTINEZ",
    preview: "Can we do Saturday at 11am?",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=47",
  },
  {
    id: "liam-oconnor",
    name: "LIAM O'CONNOR",
    preview: "Thanks! I will check those out.",
    active: true,
    avatarUrl: "https://i.pravatar.cc/100?img=15",
  },
  {
    id: "aisha-patel",
    name: "AISHA PATEL",
    preview: "Sent you the disclosure docs.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=5",
  },
  {
    id: "noah-kim",
    name: "NOAH KIM",
    preview: "Thanks! I will check those out.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=54",
  },
  {
    id: "emma-dubois",
    name: "EMMA DUBOIS",
    preview: "Sent you the disclosure docs.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=34",
  },
  {
    id: "carlos-gomez",
    name: "CARLOS GOMEZ",
    preview: "Sent you the disclosure docs.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=66",
  },
  {
    id: "nia-johnson",
    name: "NIA JOHNSON",
    preview: "Thanks! I will check those out.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=24",
  },
  {
    id: "yuki-tanaka",
    name: "YUKI TANAKA",
    preview: "Thanks! I will check those out.",
    unread: true,
    avatarUrl: "https://i.pravatar.cc/100?img=14",
  },
];

const conversation: readonly ChatMessage[] = [
  {
    id: "buyer-1",
    sender: "buyer",
    text: "Hi Liam - really interested in the Highway 140 parcel.",
    avatarUrl: "https://i.pravatar.cc/100?img=47",
  },
  {
    id: "agent-1",
    sender: "agent",
    text: "Hi Priya Raman - Yes I'm really interested in the Highway 140 parcel.",
  },
  {
    id: "buyer-2",
    sender: "buyer",
    text: "I Wil Sent you the disclosure docs.",
    avatarUrl: "https://i.pravatar.cc/100?img=47",
  },
];

export default function RealtorMessagesPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f4f6f8] px-3 pb-6 pt-4 font-ibm-plex-sans text-zinc-900 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-[1500px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid min-h-[calc(100vh-150px)] grid-cols-1 lg:grid-cols-[285px_minmax(0,1fr)]">
          <aside className="border-b border-zinc-200 bg-[#f6f8fa] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2.5 text-[#1d263d]">
                <UsersRound className="size-5" strokeWidth={2} aria-hidden />
                <p className="text-md font-phudu font-medium text-[#0F172A] uppercase leading-none tracking-tight">
                  Linked Buyers
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-[#f7f8fa] px-3 py-1.5 text-sm font-semibold text-[#3e6540] transition-colors hover:bg-[#eef2f0]"
              >
                <SlidersHorizontal className="size-5" strokeWidth={2} aria-hidden />
                Sort by
              </button>
            </div>

            <div>
              {buyerThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`flex w-full items-center gap-2.5 border-b border-zinc-200 px-3 py-2.5 text-left transition-colors ${
                    thread.active ? "bg-[#e7eaee]" : "hover:bg-zinc-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thread.avatarUrl}
                    alt={thread.name}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold leading-5 text-[#1d2630]">
                      {thread.name}
                    </p>
                    <p className="truncate text-[11px] leading-4 text-zinc-500">{thread.preview}</p>
                  </div>
                  {thread.unread ? (
                    <span className="rounded-full border border-[#94dbe7] bg-[#e7f8fb] px-2 py-0.5 text-[10px] font-semibold text-[#36a7bf]">
                      Unread
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col bg-[#fcfcfd]">
            <header className="border-b border-zinc-200 px-5 py-3.5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.pravatar.cc/100?img=15"
                  alt="Liam O'Connor"
                  className="size-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-bold uppercase text-[#1d2630]">LIAM O'CONNOR</p>
                  <p className="text-xs text-zinc-500">California · Active 12 min ago</p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-5 p-5">
              {conversation.map((message) =>
                message.sender === "buyer" ? (
                  <div key={message.id} className="flex max-w-[70%] items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.avatarUrl}
                      alt=""
                      className="mt-0.5 size-9 rounded-full object-cover"
                    />
                    <div className="rounded-2xl bg-[#f2f4f7] px-4 py-2.5 text-sm leading-relaxed text-zinc-700">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[72%] rounded-2xl bg-[#3f6f39] px-4 py-2.5 text-sm leading-relaxed text-white">
                      {message.text}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
