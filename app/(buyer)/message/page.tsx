"use client";

import { useEffect, useMemo, useState } from "react";
import { Square } from "lucide-react";
import { RealtorInformation } from "../components/realtor-information";

type Thread = {
  id: string;
  name: string;
  preview: string;
  avatarUrl: string;
  lastActive: string;
  email: string;
  phone: string;
  location: string;
};

type Message = {
  id: string;
  sender: "realtor" | "buyer";
  text: string;
};

type BuyerThreadsApiResponse = {
  threads: Array<{
    threadId: string;
    investorId: string;
    name: string;
    avatarUrl: string;
    email: string;
    phone: string;
    location: string;
    lastActive: string;
    lastMessagePreview: string;
  }>;
  error?: string;
};

type BuyerThreadMessagesApiResponse = {
  messages: Array<{
    id: string;
    sender: "investor" | "buyer";
    text: string;
    createdAt: string;
  }>;
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

export default function BuyerMessagePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDetailInformation, setShowDetailInformation] = useState(false);

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
          avatarUrl: thread.avatarUrl,
          email: thread.email,
          phone: thread.phone,
          location: thread.location,
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

        setConversation(
          (data.messages ?? []).map((message) => ({
            id: message.id,
            sender: message.sender === "investor" ? "realtor" : "buyer",
            text: message.text,
          })),
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

      setConversation((prev) => [
        ...prev,
        {
          id: sentMessage.id,
          sender: sentMessage.sender === "investor" ? "realtor" : "buyer",
          text: sentMessage.text,
        },
      ]);

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThreadId
            ? { ...thread, preview: sentMessage.text, lastActive: "just now" }
            : thread,
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
              ? "lg:grid-cols-[280px_minmax(0,1fr)_380px]"
              : "lg:grid-cols-[280px_minmax(0,1fr)]"
          }`}
        >
          <aside className="border-b border-zinc-200 bg-[#f6f8fa] lg:border-b-0 lg:border-r">
            <div className="border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2 text-[#141f2f]">
                <Square className="size-4" strokeWidth={2} aria-hidden />
                <p className="text-base font-semibold uppercase tracking-tight">Contact Realtor</p>
              </div>
            </div>

            <div>
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
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col bg-[#fcfcfd]">
            <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <div className="flex items-center gap-3">
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
                      <p className="text-sm font-bold uppercase text-[#1d2630]">{selectedThread.name}</p>
                      <p className="text-xs text-zinc-500">Active {selectedThread.lastActive}</p>
                    </div>
                  </>
                ) : null}
              </div>
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
                  {selectedThread ? "No messages yet." : "Select a conversation to view messages."}
                </p>
              ) : (
                conversation.map((message) =>
                  message.sender === "realtor" ? (
                    <div key={message.id} className="flex max-w-[70%] items-start gap-3">
                      {selectedThread?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedThread.avatarUrl}
                          alt=""
                          className="mt-0.5 size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                          {(selectedThread?.name ?? "R").charAt(0).toUpperCase()}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={isLoadingMessages || !selectedThread}
                  className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={isSending || !selectedThread || isLoadingMessages || !draftMessage.trim()}
                  className="rounded-lg bg-[#3f6f39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345f30] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </section>
          {showDetailInformation ? (
            <div className="border-t border-zinc-200 bg-[#f3f4f6] p-3 lg:border-l lg:border-t-0">
              <RealtorInformation
                name={selectedThread?.name ?? "No Realtor Selected"}
                avatarUrl={selectedThread?.avatarUrl}
                lastActive={selectedThread?.lastActive ?? "-"}
                email={selectedThread?.email ?? ""}
                phone={selectedThread?.phone ?? ""}
                location={selectedThread?.location ?? ""}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
