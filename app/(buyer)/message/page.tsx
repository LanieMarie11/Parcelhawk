"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RealtorInformation } from "../components/realtor-information";
import MessageBoxIcon from "@/components/icons/message-box";
import { MessageComposer } from "@/components/message-composer";
import { ThreadConversationTimeline } from "@/components/thread-conversation-timeline";
import type { ThreadTimelineItem, ThreadTimelineViewingRequest } from "@/lib/thread-timeline";
import { resolveListingSatellitePreviewUrl } from "@/lib/parcel-satellite-preview-client";

type Thread = {
  id: string;
  name: string;
  preview: string;
  unread: boolean;
  avatarUrl: string;
  lastActive: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
};

type ConversationItem =
  | {
      kind: "message";
      id: string;
      sender: "realtor" | "buyer";
      text: string;
      createdAt: string;
    }
  | ThreadTimelineViewingRequest;

type BuyerThreadsApiResponse = {
  threads: Array<{
    threadId: string;
    investorId: string;
    name: string;
    avatarUrl: string;
    email: string;
    phone: string;
    location: string;
    bio: string;
    lastActive: string;
    lastMessagePreview: string;
    unreadCount: number;
  }>;
  error?: string;
};

type BuyerThreadMessagesApiResponse = {
  timeline?: ThreadTimelineItem[];
  error?: string;
};

type BuyerSendMessageApiResponse = {
  message?: {
    id: string;
    sender: "investor" | "buyer";
    text: string;
    createdAt: string;
  };
  error?: string;
};

function mapTimelineForBuyer(items: ThreadTimelineItem[]): ConversationItem[] {
  return items.map((item) =>
    item.kind === "message"
      ? {
          kind: "message" as const,
          id: item.id,
          sender: item.sender === "investor" ? ("realtor" as const) : ("buyer" as const),
          text: item.text,
          createdAt: item.createdAt,
        }
      : {
          ...item,
          parcelSatelliteMapDataUrl:
            resolveListingSatellitePreviewUrl(item) ?? item.parcelSatelliteMapDataUrl ?? null,
        },
  );
}

export default function BuyerMessagePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDetailInformation, setShowDetailInformation] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadThreads() {
      try {
        const response = await fetch("/api/buyer/messages/threads", { cache: "no-store" });
        const data = (await response.json()) as BuyerThreadsApiResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load message threads");
        }

        const mappedThreads: Thread[] = (data.threads ?? []).map((thread) => ({
          id: thread.threadId,
          name: thread.name.toUpperCase(),
          preview: thread.lastMessagePreview,
          unread: thread.unreadCount > 0,
          avatarUrl: thread.avatarUrl,
          email: thread.email,
          phone: thread.phone,
          location: thread.location,
          bio: thread.bio,
          lastActive: thread.lastActive,
        }));

        if (!isMounted) return;
        setThreads(mappedThreads);
        setSelectedThreadId((current) => current ?? mappedThreads[0]?.id ?? null);
      } catch {
        if (!isMounted) return;
        setThreads([]);
      } finally {
        if (isMounted) setIsLoadingThreads(false);
      }
    }

    void loadThreads();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadConversation() {
      if (!selectedThreadId) {
        if (isMounted) {
          setConversation([]);
          setIsLoadingMessages(false);
        }
        return;
      }

      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/buyer/messages/threads/${selectedThreadId}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as BuyerThreadMessagesApiResponse;
        if (!response.ok) {
          if (isMounted) setConversation([]);
          return;
        }
        if (!isMounted) return;

        setConversation(mapTimelineForBuyer(data.timeline ?? []));
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === selectedThreadId ? { ...thread, unread: false } : thread,
          ),
        );
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    void loadConversation();
    return () => {
      isMounted = false;
    };
  }, [selectedThreadId]);

  useEffect(() => {
    if (isLoadingMessages) return;
    const container = messageScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [conversation, isLoadingMessages, selectedThreadId]);

  async function sendMessage() {
    const text = draftMessage.trim();
    if (!text || !selectedThreadId) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/buyer/messages/threads/${selectedThreadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as BuyerSendMessageApiResponse;
      if (!response.ok || !data.message) return;
      const sentMessage = data.message;

      const createdAt = sentMessage.createdAt ?? new Date().toISOString();
      setConversation((prev) => [
        ...prev,
        {
          kind: "message" as const,
          id: sentMessage.id,
          sender: sentMessage.sender === "investor" ? ("realtor" as const) : ("buyer" as const),
          text: sentMessage.text,
          createdAt,
        },
      ]);

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThreadId
            ? { ...thread, preview: sentMessage.text, lastActive: "just now", unread: false }
            : thread,
        ),
      );
      setDraftMessage("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="box-border flex h-[calc(100dvh-73px)] min-h-0 w-full flex-col overflow-hidden bg-[#f4f6f8] px-3 pb-4 pt-3 font-ibm-plex-sans text-zinc-900 sm:px-4 lg:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div
          className={`grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-rows-1 lg:overflow-hidden ${
            showDetailInformation
              ? "lg:grid-cols-[280px_minmax(0,1fr)_380px]"
              : "lg:grid-cols-[280px_minmax(0,1fr)]"
          }`}
        >
          <aside className="flex h-full min-h-0 max-h-full flex-col overflow-hidden border-b border-zinc-200 bg-[#f6f8fa] lg:border-b-0 lg:border-r">
            <div className="border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2 text-[#141f2f] align-middle">
                <MessageBoxIcon />
                <p className="text-xl font-medium font-phudu uppercase tracking-tight">Contact Realtor</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoadingThreads ? (
                <p className="px-4 py-4 text-sm text-zinc-500">Loading conversations...</p>
              ) : threads.length === 0 ? (
                <p className="px-4 py-4 text-sm text-zinc-500">No conversations found.</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`flex w-full items-center gap-2.5 border-b border-zinc-200 px-4 py-3 text-left transition-colors ${
                      thread.id === selectedThreadId ? "bg-[#e7eaee]" : "hover:bg-zinc-100"
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
                      <p className="truncate text-[13px] font-bold leading-4 text-[#1d2630]">{thread.name}</p>
                      <p className="truncate text-[12px] leading-4 text-zinc-500">{thread.preview}</p>
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

          <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fcfcfd]">
            <header className="shrink-0 flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowDetailInformation((prev) => !prev)}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-zinc-100"
              >
                {selectedThread ? (
                  <>
                    {selectedThread.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedThread.avatarUrl}
                        alt={selectedThread.name}
                        className="size-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                        {selectedThread.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-md font-medium font-phudu uppercase text-[#1d2630]">{selectedThread.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {(selectedThread.location || "Unknown location") + " · Active " + selectedThread.lastActive}
                      </p>
                    </div>
                  </>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setShowDetailInformation((prev) => !prev)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {showDetailInformation ? "Hide Detail Information" : "View Detail Information"}
              </button>
            </header>

            <div
              ref={messageScrollRef}
              className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6"
            >
              {isLoadingMessages ? (
                <p className="text-sm text-zinc-500">Loading messages...</p>
              ) : conversation.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {selectedThread ? "No messages yet." : "Select a conversation to view messages."}
                </p>
              ) : (
                <ThreadConversationTimeline
                  variant="buyer"
                  items={conversation.map((item) =>
                    item.kind === "viewing_request"
                      ? item
                      : {
                          kind: "message" as const,
                          id: item.id,
                          text: item.text,
                          createdAt: item.createdAt,
                          direction:
                            item.sender === "realtor" ? ("incoming" as const) : ("outgoing" as const),
                          incomingAvatarUrl:
                            item.sender === "realtor" ? selectedThread?.avatarUrl : undefined,
                          incomingPlaceholderInitial: (selectedThread?.name ?? "R")
                            .charAt(0)
                            .toUpperCase(),
                        },
                  )}
                />
              )}
            </div>
            <MessageComposer
              value={draftMessage}
              onChange={setDraftMessage}
              onSend={() => void sendMessage()}
              inputDisabled={isLoadingMessages}
              controlsDisabled={isLoadingMessages || !selectedThread}
              sendDisabled={isSending || !selectedThread || isLoadingMessages}
            />
          </section>
          {showDetailInformation ? (
            <div className="h-full min-h-0 overflow-y-auto border-t border-zinc-200 bg-[#f3f4f6] p-3 lg:border-l lg:border-t-0">
              <RealtorInformation
                name={selectedThread?.name ?? "No Realtor Selected"}
                avatarUrl={selectedThread?.avatarUrl}
                lastActive={selectedThread?.lastActive ?? "-"}
                email={selectedThread?.email ?? ""}
                phone={selectedThread?.phone ?? ""}
                location={selectedThread?.location ?? ""}
                bio={selectedThread?.bio}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
