"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, UsersRound } from "lucide-react";

type BuyerThread = {
  id: string;
  threadId: string;
  name: string;
  preview: string;
  unread?: boolean;
  avatarUrl: string;
  location?: string;
  lastActive?: string;
};

type ChatMessage = {
  id: string;
  sender: "buyer" | "agent";
  text: string;
  avatarUrl?: string;
};

type MessageThreadsApiResponse = {
  threads: Array<{
    threadId: string;
    buyerId: string;
    name: string;
    avatarUrl: string;
    location: string;
    lastActive: string;
    lastMessagePreview: string;
    unreadCount: number;
  }>;
  error?: string;
};
type ThreadMessagesApiResponse = {
  messages: Array<{
    id: string;
    sender: "investor" | "buyer";
    text: string;
    createdAt: string;
  }>;
  error?: string;
};

export default function RealtorMessagesPage() {
  const [buyerThreads, setBuyerThreads] = useState<BuyerThread[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBuyers() {
      try {
        const response = await fetch("/api/realtor-portal/messages/threads", { cache: "no-store" });
        const data = (await response.json()) as MessageThreadsApiResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load message threads");
        }

        const threads: BuyerThread[] = (data.threads ?? []).map((thread) => ({
          threadId: thread.threadId,
          id: thread.buyerId,
          name: thread.name.toUpperCase(),
          preview: thread.lastMessagePreview,
          unread: thread.unreadCount > 0,
          avatarUrl: thread.avatarUrl,
          location: thread.location,
          lastActive: thread.lastActive,
        }));

        if (!isMounted) return;
        setBuyerThreads(threads);
        setSelectedBuyerId((current) => current ?? threads[0]?.id ?? null);
      } catch {
        if (!isMounted) return;
        setBuyerThreads([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBuyers();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedThread = useMemo(
    () => buyerThreads.find((thread) => thread.id === selectedBuyerId) ?? null,
    [buyerThreads, selectedBuyerId],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      if (!selectedThread?.threadId) {
        if (isMounted) {
          setConversation([]);
          setIsLoadingMessages(false);
        }
        return;
      }
      setIsLoadingMessages(true);
      try {
        const response = await fetch(
          `/api/realtor-portal/messages/threads/${selectedThread.threadId}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as ThreadMessagesApiResponse;
        if (!response.ok) {
          if (isMounted) setConversation([]);
          return;
        }
        if (!isMounted) return;
        setConversation(
          (data.messages ?? []).map((message) => ({
            id: message.id,
            sender: message.sender === "investor" ? "agent" : "buyer",
            text: message.text,
            avatarUrl: message.sender === "buyer" ? selectedThread.avatarUrl : undefined,
          })),
        );
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }
    void loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedThread?.threadId, selectedThread?.avatarUrl]);

  async function sendMessage() {
    const text = draftMessage.trim();
    if (!text || !selectedThread?.threadId) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/realtor-portal/messages/threads/${selectedThread.threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as { message?: { id: string; text: string }; error?: string };
      if (!response.ok || !data.message) return;
      setConversation((prev) => [
        ...prev,
        { id: data.message!.id, sender: "agent", text: data.message!.text },
      ]);
      setBuyerThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThread.id ? { ...thread, preview: text } : thread,
        ),
      );
      setDraftMessage("");
    } finally {
      setIsSending(false);
    }
  }

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
              {isLoading ? (
                <p className="px-4 py-4 text-sm text-zinc-500">Loading buyers...</p>
              ) : buyerThreads.length === 0 ? (
                <p className="px-4 py-4 text-sm text-zinc-500">No linked buyers found.</p>
              ) : (
                buyerThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedBuyerId(thread.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-zinc-200 px-3 py-2.5 text-left transition-colors ${
                    thread.id === selectedBuyerId ? "bg-[#e7eaee]" : "hover:bg-zinc-100"
                  }`}
                >
                  {thread.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thread.avatarUrl}
                      alt={thread.name}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                      {thread.name.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col bg-[#fcfcfd]">
            <header className="border-b border-zinc-200 px-5 py-3.5">
              <div className="flex items-center gap-3">
                {selectedThread?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedThread.avatarUrl}
                    alt={selectedThread?.name ?? "Buyer"}
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                    {(selectedThread?.name ?? "B").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold uppercase text-[#1d2630]">
                    {selectedThread?.name ?? "No buyer selected"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {(selectedThread?.location || "Unknown location") +
                      " · Active " +
                      (selectedThread?.lastActive || "-")}
                  </p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {isLoadingMessages ? (
                <p className="text-sm text-zinc-500">Loading messages...</p>
              ) : conversation.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {selectedThread ? "No messages yet. Say hello below." : "Select a buyer to view messages."}
                </p>
              ) : (
                conversation.map((message) =>
                  message.sender === "buyer" ? (
                    <div key={message.id} className="flex max-w-[70%] items-start gap-3">
                      {message.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.avatarUrl}
                          alt=""
                          className="mt-0.5 size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                          {(selectedThread?.name ?? "B").charAt(0).toUpperCase()}
                        </div>
                      )}
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
                )
              )}
            </div>
            <div className="border-t border-zinc-200 p-4">
              <div className="flex items-center gap-2">
                <input
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoadingMessages}
                  className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={isSending || !selectedThread || isLoadingMessages}
                  className="rounded-lg bg-[#3f6f39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345f30] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
