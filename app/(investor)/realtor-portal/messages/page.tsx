"use client";

import { useEffect, useMemo, useState } from "react";
import { BuyerInformation } from "../components/buyer-information";
import { LinkedBuyersPanel, type BuyerThread } from "./components/linked-buyers-panel";
import { ThreadConversationTimeline } from "@/components/thread-conversation-timeline";
import type { ThreadTimelineItem, ThreadTimelineViewingRequest } from "@/lib/thread-timeline";

type ChatItem =
  | {
      kind: "message";
      id: string;
      sender: "buyer" | "agent";
      text: string;
      createdAt: string;
      avatarUrl?: string;
    }
  | ThreadTimelineViewingRequest;

type MessageThreadsApiResponse = {
  threads: Array<{
    threadId: string;
    buyerId: string;
    name: string;
    avatarUrl: string;
    email: string;
    phone: string;
    location: string;
    preferenceBudget: string;
    preferenceAcreage: string;
    preferencePurpose: string;
    preferenceTimeframe: string;
    lastActive: string;
    lastMessagePreview: string;
    unreadCount: number;
  }>;
  error?: string;
};
type ThreadMessagesApiResponse = {
  timeline?: ThreadTimelineItem[];
  error?: string;
};

function mapTimelineForRealtor(items: ThreadTimelineItem[], buyerAvatarUrl: string): ChatItem[] {
  return items.map((item) =>
    item.kind === "message"
      ? {
          kind: "message" as const,
          id: item.id,
          sender: item.sender === "buyer" ? ("buyer" as const) : ("agent" as const),
          text: item.text,
          createdAt: item.createdAt,
          avatarUrl: item.sender === "buyer" ? buyerAvatarUrl : undefined,
        }
      : item
  );
}

export default function RealtorMessagesPage() {
  const [buyerThreads, setBuyerThreads] = useState<BuyerThread[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatItem[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showDetailInformation, setShowDetailInformation] = useState(false);

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
          email: thread.email,
          phone: thread.phone,
          location: thread.location,
          preferenceBudget: thread.preferenceBudget,
          preferenceAcreage: thread.preferenceAcreage,
          preferencePurpose: thread.preferencePurpose,
          preferenceTimeframe: thread.preferenceTimeframe,
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
        setConversation(mapTimelineForRealtor(data.timeline ?? [], selectedThread.avatarUrl));
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
      const data = (await response.json()) as {
        message?: { id: string; text: string; createdAt?: string };
        error?: string;
      };
      if (!response.ok || !data.message) return;
      const createdAt = data.message.createdAt ?? new Date().toISOString();
      setConversation((prev) => [
        ...prev,
        {
          kind: "message" as const,
          id: data.message!.id,
          sender: "agent" as const,
          text: data.message!.text,
          createdAt,
        },
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
        <div
          className={`grid min-h-[calc(100vh-150px)] grid-cols-1 ${
            showDetailInformation
              ? "lg:grid-cols-[285px_minmax(0,1fr)_380px]"
              : "lg:grid-cols-[285px_minmax(0,1fr)]"
          }`}
        >
          <LinkedBuyersPanel
            threads={buyerThreads}
            isLoading={isLoading}
            selectedBuyerId={selectedBuyerId}
            onSelectBuyer={setSelectedBuyerId}
          />

          <section className="flex min-h-[520px] flex-col bg-[#fcfcfd]">
            <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowDetailInformation((prev) => !prev)}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-zinc-100"
              >
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
                  <p className="text-md font-medium font-phudu uppercase text-[#1d2630]">
                    {selectedThread?.name ?? "No buyer selected"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {(selectedThread?.location || "Unknown location") +
                      " · Active " +
                      (selectedThread?.lastActive || "-")}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowDetailInformation((prev) => !prev)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {showDetailInformation ? "Hide Detail Information" : "View Detail Information"}
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {isLoadingMessages ? (
                <p className="text-sm text-zinc-500">Loading messages...</p>
              ) : conversation.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {selectedThread ? "No messages yet. Say hello below." : "Select a buyer to view messages."}
                </p>
              ) : (
                <ThreadConversationTimeline
                  variant="realtor"
                  items={conversation.map((item) =>
                    item.kind === "viewing_request"
                      ? item
                      : {
                          kind: "message" as const,
                          id: item.id,
                          text: item.text,
                          createdAt: item.createdAt,
                          direction: item.sender === "buyer" ? ("incoming" as const) : ("outgoing" as const),
                          incomingAvatarUrl:
                            item.sender === "buyer" ? item.avatarUrl : undefined,
                          incomingPlaceholderInitial: (selectedThread?.name ?? "B")
                            .charAt(0)
                            .toUpperCase(),
                        },
                  )}
                />
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
          {showDetailInformation ? (
            <div className="border-t border-zinc-200 bg-[#f3f4f6] p-3 lg:border-l lg:border-t-0">
              <BuyerInformation
                name={selectedThread?.name ?? "No Buyer Selected"}
                avatarUrl={selectedThread?.avatarUrl}
                lastActive={selectedThread?.lastActive ?? "-"}
                email={selectedThread?.email ?? ""}
                phone={selectedThread?.phone ?? ""}
                location={selectedThread?.location ?? ""}
                preferenceBudget={selectedThread?.preferenceBudget ?? ""}
                preferenceAcreage={selectedThread?.preferenceAcreage ?? ""}
                preferencePurpose={selectedThread?.preferencePurpose ?? ""}
                preferenceTimeframe={selectedThread?.preferenceTimeframe ?? ""}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
