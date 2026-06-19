"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type AdminProfileMenuProps = {
  triggerClassName?: string;
};

export function AdminProfileMenu({ triggerClassName }: AdminProfileMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const user = session?.user as
    | { email?: string | null; name?: string | null }
    | undefined;
  const displayName = user?.email?.split("@")[0] ?? user?.name ?? "Admin";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          triggerClassName ??
          "flex min-w-[140px] items-center justify-between gap-2 rounded-lg border border-white/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/80 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="p-4">
            <p className="truncate text-base font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email ?? "Admin"}
            </p>
          </div>

          <div className="h-px w-full bg-border" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/admin/sign-in" });
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
