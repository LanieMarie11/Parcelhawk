import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { ThreadTimelineViewingRequest } from "@/lib/thread-timeline";
import {
  formatChatMessageTime,
  formatViewingRequestHeroListingLine,
  formatViewingRequestScheduledTime,
  formatViewingStatus,
} from "@/lib/format-thread-message";

function formatViewingCardPrice(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const num = Number(s.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(num)) return s;
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatViewingCardAcres(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const num = Number(s.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num)) return /acre/i.test(s) ? s : `${s} acres`;
  const label = Math.abs(num) === 1 ? "acre" : "acres";
  const formatted =
    Math.abs(num % 1) < 1e-9
      ? num.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted} ${label}`;
}

/** Local calendar day key for grouping (messages + viewing requests). */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** e.g. "4/28/2026" — date separator pill label */
function formatDayDividerLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function DateDividerRow({ iso }: { iso: string }) {
  const label = formatDayDividerLabel(iso);
  const d = new Date(iso);
  const dateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (
    <div className="flex justify-center py-2" role="separator" aria-label={`Messages from ${label}`}>
      <time
        dateTime={dateTime}
        className="rounded-full bg-zinc-500/95 px-3 py-1 text-[11px] font-medium tabular-nums text-white shadow-sm"
      >
        {label}
      </time>
    </div>
  );
}

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
  let previousDayKey: string | undefined;

  return (
    <>
      {items.flatMap((item) => {
        const dayKey = localDayKey(item.createdAt);
        const chunk: ReactNode[] = [];

        if (previousDayKey !== dayKey) {
          previousDayKey = dayKey;
          chunk.push(<DateDividerRow key={`day-divider-${item.id}`} iso={item.createdAt} />);
        }

        chunk.push(
          item.kind === "viewing_request" ? (
            <ViewingRequestRow key={item.id} item={item} variant={variant} />
          ) : item.direction === "incoming" ? (
            <IncomingMessageRow key={item.id} item={item} />
          ) : (
            <OutgoingMessageRow key={item.id} item={item} />
          ),
        );

        return chunk;
      })}
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
  const heroListingCaption =
    item.fullAddress.trim() || formatViewingRequestHeroListingLine(item.listingId);
  const heroImageUrl = item.parcelSatelliteMapDataUrl ?? null;
  const priceLine = formatViewingCardPrice(item.price);
  const acresLine = formatViewingCardAcres(item.acres);

  return (
    <div className="w-full max-w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-[#3f6f39]/50 bg-white shadow-sm sm:max-w-md">
      <div
        className={
          heroImageUrl
            ? "relative aspect-16/10 bg-zinc-300"
            : "relative aspect-16/10 bg-linear-to-br from-[#cdd8ce] via-zinc-300 to-[#dfe6df]"
        }
        style={
          heroImageUrl
            ? {
                backgroundImage: `url(${heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" aria-hidden />
        <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-[2px]">
          {formatViewingStatus(item.status)}
        </span>
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3 text-white">
          <div className="flex items-start gap-1.5 text-md font-regular font-ibm-plex-sans leading-snug drop-shadow-sm">
            <MapPin className="mt-0.5 size-3.5 shrink-0 opacity-95" aria-hidden strokeWidth={2} />
            <span>{heroListingCaption}</span>
          </div>
          {priceLine || acresLine ? (
            <div className="flex text-md font-regular flex-wrap items-baseline gap-x-2 gap-y-0.5 drop-shadow-sm">
              {priceLine ? (
                <span className="text-base font-medium tabular-nums tracking-tight">{priceLine}</span>
              ) : null}
              {priceLine && acresLine ? (
                <span className="text-sm font-semibold text-white/75" aria-hidden>
                  ·
                </span>
              ) : null}
              {acresLine ? (
                <span className="text-sm font-medium tabular-nums">{acresLine}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-100 px-4 pb-3 pt-3 text-sm text-zinc-800">
       {/* TODO: Add back in when we have a way to show the viewing request time */}
        {/* <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-2">
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
        </div> */}

        <p className="mt-2 text-xs font-medium text-zinc-700">
          Listing #{item.listingId} · {formatViewingStatus(item.status)}
        </p>

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

        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-phudu text-[14px] font-regular text-[#2D5A36] uppercase tracking-wide underline-offset-2 hover:underline"
          >
            VIEW LISTING DETAILS
          </a>
        ) : (
          <p
            className="mt-4 font-phudu text-[14px] font-regular text-[#2D5A36] uppercase tracking-wide"
          >
            VIEW LISTING DETAILS
          </p>
        )}
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
  const sideTimeIso = item.scheduledAt ?? item.createdAt;
  const sideTimeLabel = item.scheduledAt
    ? formatViewingRequestScheduledTime(item.scheduledAt)
    : formatChatMessageTime(item.createdAt);

  if (alignOutgoing) {
    return (
      <div className="flex w-full items-end justify-end gap-1.5 px-2">
        <time
          className="shrink-0 whitespace-nowrap pb-2 text-xs text-zinc-400"
          dateTime={sideTimeIso}
        >
          {sideTimeLabel}
        </time>
        <span className="shrink-0 pb-2 text-zinc-400" aria-hidden>
          ·
        </span>
        <ViewingRequestCard item={item} omitHeaderSubmittedAt />
      </div>
    );
  }

  return (
    <div className="flex w-full items-end justify-start gap-1.5 px-2">
      <ViewingRequestCard item={item} />
      <span className="shrink-0 pb-2 text-zinc-400" aria-hidden>
        ·
      </span>
      <time className="shrink-0 whitespace-nowrap pb-2 text-xs text-zinc-400" dateTime={sideTimeIso}>
        {sideTimeLabel}
      </time>
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
        <div className="max-w-full whitespace-pre-wrap wrap-break-word rounded-2xl bg-[#f2f4f7] px-4 py-2.5 text-sm leading-relaxed text-zinc-700 [tab-size:4]">
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
        <div className="max-w-full whitespace-pre-wrap wrap-break-word rounded-2xl bg-[#3f6f39] px-4 py-2.5 text-sm leading-relaxed text-white [tab-size:4]">
          {item.text}
        </div>
      </div>
    </div>
  );
}
