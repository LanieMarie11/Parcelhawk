import Link from "next/link"

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
  onIgnore?: (id: string) => void
  onConnect?: (id: string) => void
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

export function NotificationCard({
  notification,
  onMarkRead,
  onIgnore,
  onConnect,
}: NotificationCardProps) {
  const { unread, title, timestamp, category, description, avatar, actions, readAt } = notification

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

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-white pl-5 pr-4 py-4 shadow-sm transition-colors ${
        unread ? "!border-l-4 !border-l-[#B0E3F899]" : ""
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
              <span className="inline-flex items-center rounded-full border border-[#00A6E8] bg-[#E6F6FD] px-2.5 py-0.5 text-xs font-medium text-[#00A6E8]">
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
                onClick={() => {
                  onConnect?.(notification.id)
                  handleAction()
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active"
              >
                {actions.primary.label}
              </button>
              <button
                type="button"
                onClick={() => {
                  onIgnore?.(notification.id)
                  handleAction()
                }}
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
        </div>
      </div>
    </article>
  )
}
