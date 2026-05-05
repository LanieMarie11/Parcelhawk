import { Calendar, MapPin } from "lucide-react";
import type { ThreadTimelineViewingRequest } from "@/lib/thread-timeline";
import {
  formatChatMessageTime,
  formatViewingRequestHeroListingLine,
  formatViewingRequestScheduledTime,
  formatViewingStatus,
} from "@/lib/format-thread-message";

export type ThreadConversationTimelineItem =
  | {
      kind: "message";
      id: string;
      text: string;
      createdAt: string;
      direction: "incoming" | "outgoing";
      incomingAvatarUrl?: string;
      incomingPlaceholderInitial: string;
    }
  | ThreadTimelineViewingRequest;

type ThreadConversationTimelineProps = {
  variant: "buyer" | "realtor";
  items: ThreadConversationTimelineItem[];
};

export function ThreadConversationTimeline({ variant, items }: ThreadConversationTimelineProps) {
  return (
    <>
      {items.map((item) =>
        item.kind === "viewing_request" ? (
          <ViewingRequestRow key={item.id} item={item} variant={variant} />
        ) : item.direction === "incoming" ? (
          <IncomingMessageRow key={item.id} item={item} />
        ) : (
          <OutgoingMessageRow key={item.id} item={item} />
        ),
      )}
    </>
  );
}

function ViewingRequestCard({
  item,
  omitHeaderSubmittedAt,
}: {
  item: ThreadTimelineViewingRequest;
  /** When true, timeline shows submitted time beside the card (buyer/outgoing layout). */
  omitHeaderSubmittedAt?: boolean;
}) {
  const accentClass = "text-[#3f6f39]";
  const heroListingCaption = formatViewingRequestHeroListingLine(item.listingId);

  return (
    <div className="w-full max-w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-[#3f6f39]/50 bg-white shadow-sm sm:max-w-md">
      <div className="relative aspect-16/10 bg-linear-to-br from-[#cdd8ce] via-zinc-300 to-[#dfe6df]">
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" aria-hidden />
        <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-[2px]">
          {formatViewingStatus(item.status)}
        </span>
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3 text-white">
          <div className="flex items-start gap-1.5 text-sm font-semibold leading-snug drop-shadow-sm">
            <MapPin className="mt-0.5 size-3.5 shrink-0 opacity-95" aria-hidden strokeWidth={2} />
            <span>{heroListingCaption}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 px-4 pb-3 pt-3 text-sm text-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${accentClass}`}>Viewing request</p>
          {!omitHeaderSubmittedAt ? (
            <>
              <span className="text-zinc-400" aria-hidden>
                ·
              </span>
              <time className="whitespace-nowrap text-[11px] text-zinc-400" dateTime={item.createdAt}>
                {formatChatMessageTime(item.createdAt)}
              </time>
            </>
          ) : null}
        </div>

        <p className="mt-2 text-xs font-medium text-zinc-700">
          Listing #{item.listingId} · {formatViewingStatus(item.status)}
        </p>

        {item.scheduledAt ? (
          <div className="mt-3 flex items-center gap-3 rounded-full border border-zinc-200/90 bg-[#eef0f3] px-4 py-2.5">
            <Calendar className={`size-5 shrink-0 ${accentClass}`} strokeWidth={2} aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-500">Request Time</p>
              <time
                className="mt-0.5 block text-sm font-semibold leading-snug text-zinc-900"
                dateTime={item.scheduledAt}
              >
                {formatViewingRequestScheduledTime(item.scheduledAt)}
              </time>
            </div>
          </div>
        ) : null}

        {item.buyerNote ? (
          <figure className="mt-3 flex gap-0">
            <span
              className="w-1 shrink-0 rounded-full bg-linear-to-b from-amber-400 via-amber-500 to-amber-600 shadow-[2px_0_8px_rgba(245,158,11,0.35)]"
              aria-hidden
            />
            <blockquote className="min-w-0 flex-1 pl-3 text-sm leading-relaxed text-zinc-600">
              <p className="whitespace-pre-wrap">&ldquo;{item.buyerNote}&rdquo;</p>
            </blockquote>
          </figure>
        ) : null}

        <p
          className={`mt-4 text-[11px] font-bold uppercase tracking-wide ${accentClass}`}
        >
          VIEW LISTING DETAILS
        </p>
      </div>
    </div>
  );
}

function ViewingRequestRow({
  item,
  variant,
}: {
  item: ThreadTimelineViewingRequest;
  variant: "buyer" | "realtor";
}) {
  const alignOutgoing = variant === "buyer";

  if (alignOutgoing) {
    return (
      <div className="flex w-full items-start justify-end gap-1.5 px-2">
        <time
          className="shrink-0 whitespace-nowrap pt-2 text-xs text-zinc-400"
          dateTime={item.createdAt}
        >
          {formatChatMessageTime(item.createdAt)}
        </time>
        <span className="shrink-0 pt-2 text-zinc-400" aria-hidden>
          ·
        </span>
        <ViewingRequestCard item={item} omitHeaderSubmittedAt />
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start px-2">
      <ViewingRequestCard item={item} />
    </div>
  );
}

type MessageRowItem = Extract<ThreadConversationTimelineItem, { kind: "message" }>;

function IncomingMessageRow({ item }: { item: MessageRowItem }) {
  return (
    <div className="flex max-w-[min(85%,100%)] items-center gap-3">
      {item.incomingAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.incomingAvatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
          {item.incomingPlaceholderInitial}
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="max-w-full rounded-2xl bg-[#f2f4f7] px-4 py-2.5 text-sm leading-relaxed text-zinc-700 wrap-break-word">
          {item.text}
        </div>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          ·
        </span>
        <time className="shrink-0 whitespace-nowrap text-xs text-zinc-400" dateTime={item.createdAt}>
          {formatChatMessageTime(item.createdAt)}
        </time>
      </div>
    </div>
  );
}

function OutgoingMessageRow({ item }: { item: MessageRowItem }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[min(72%,100%)] items-center gap-1.5">
        <time className="shrink-0 whitespace-nowrap text-xs text-zinc-400" dateTime={item.createdAt}>
          {formatChatMessageTime(item.createdAt)}
        </time>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          ·
        </span>
        <div className="max-w-full rounded-2xl bg-[#3f6f39] px-4 py-2.5 text-sm leading-relaxed text-white wrap-break-word">
          {item.text}
        </div>
      </div>
    </div>
  );
}
