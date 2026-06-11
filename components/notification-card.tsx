"use client"

import Link from "next/link"
import { useState } from "react"
import { Trash2 } from "lucide-react"

export type NotificationCategory =
  | "Parcel match"
  | "New listing"
  | "Invitation"
  | "New message"
  | "Price drop"
  | "Viewing request"

export type NotificationItem = {
  id: string
  title: string
  timestamp: string
  readAt?: string
  category: NotificationCategory
  description: string
  endReason?: string
  unread: boolean
  avatar?: {
    initials: string
    bgColor: string
  }
  actions:
    | { type: "single"; label: string; href?: string }
    | {
        type: "dual"
        primary: { label: string; href?: string }
        secondary: { label: string }
      }
}

type NotificationCardProps = {
  notification: NotificationItem
  onMarkRead?: (id: string) => void
  onIgnore?: (id: string) => void | Promise<boolean>
  onConnect?: (id: string) => void | Promise<boolean>
  onDelete?: (id: string) => void
}

type PendingAction = "connect" | "ignore"

const ACTION_MODAL_COPY: Record<
  PendingAction,
  { title: string; description: string; confirmLabel: string }
> = {
  connect: {
    title: "Connect with buyer?",
    description:
      "This will link the buyer to your account and allow them to message you and request viewings.",
    confirmLabel: "Connect",
  },
  ignore: {
    title: "Ignore connection request?",
    description:
      "The buyer will not be connected to your account. You can still view this notification later.",
    confirmLabel: "Ignore",
  },
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

function OutlineActionButton({
  label,
  href,
  onClick,
}: {
  label: string
  href?: string
  onClick?: () => void
}) {
  const className =
    "inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50"

  if (href) {
    if (isExternalHref(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onClick}
        >
          {label}
        </a>
      )
    }

    return (
      <Link href={href} className={className} onClick={onClick}>
        {label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  )
}

function NotificationActionModal({
  action,
  onClose,
  onConfirm,
}: {
  action: PendingAction
  onClose: () => void
  onConfirm: () => void
}) {
  const copy = ACTION_MODAL_COPY[action]

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[416px] rounded-xl bg-[#f6f7f8] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-action-modal-title"
      >
        <h3
          id="notification-action-modal-title"
          className="font-phudu text-2xl font-medium tracking-tight text-[#030303]"
        >
          {copy.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 bg-[#f7f7f8] px-4 py-[10px] text-sm font-medium text-[#000000] transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-[10px] text-sm font-medium text-white transition-colors ${
              action === "connect"
                ? "bg-brand-green hover:bg-brand-green-hover active:bg-brand-green-active"
                : "bg-[#111827] hover:bg-[#1f2937]"
            }`}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationCard({
  notification,
  onMarkRead,
  onIgnore,
  onConnect,
  onDelete,
}: NotificationCardProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const { unread, title, timestamp, category, description, endReason, avatar, actions, readAt } =
    notification

  const readAtLabel =
    !unread && readAt
      ? new Date(readAt).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null

  const handleAction = () => {
    if (unread) onMarkRead?.(notification.id)
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return

    const ok =
      pendingAction === "connect"
        ? (await onConnect?.(notification.id)) !== false
        : (await onIgnore?.(notification.id)) !== false

    if (ok) {
      handleAction()
    }

    setPendingAction(null)
  }

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-white pl-5 pr-4 py-4 shadow-sm transition-colors ${
          unread ? "!border-l-4 !border-l-[#B0E3F899]" : "!border-l-4 !border-l-[#D9DADF]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {unread ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-[#00A6E8]"
                    aria-hidden
                  />
                ) : (
                  <span className="size-2 shrink-0" aria-hidden />
                )}
                <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
                <span className="text-sm text-[#6B7280]">{timestamp}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    unread
                      ? "border-[#00A6E8] bg-[#E6F6FD] text-[#00A6E8]"
                      : "border-[#D9DADF] bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {category}
                </span>
                {avatar ? (
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-[#373940]"
                    style={{ backgroundColor: avatar.bgColor }}
                    aria-hidden
                  >
                    {avatar.initials}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280]">
                {description}
                {endReason ? (
                  <span className="mt-1 block">
                    Reason: {endReason}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end sm:pl-4">
            {actions.type === "single" ? (
              <OutlineActionButton
                label={actions.label}
                href={actions.href}
                onClick={handleAction}
              />
            ) : unread ? (
              <>
                <button
                  type="button"
                  onClick={() => setPendingAction("connect")}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active"
                >
                  {actions.primary.label}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction("ignore")}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50"
                >
                  {actions.secondary.label}
                </button>
              </>
            ) : category === "Invitation" ? (
              <span className="text-xs text-[#6B7280]">
                {readAtLabel ? `Read on ${readAtLabel}` : "Read"}
              </span>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(notification.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#EE5A5A] transition-colors hover:bg-red-50"
                aria-label="Delete notification"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {pendingAction ? (
        <NotificationActionModal
          action={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
        />
      ) : null}
    </>
  )
}
