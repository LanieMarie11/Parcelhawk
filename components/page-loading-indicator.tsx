"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageLoadingIndicatorProps {
  label?: string
  fixed?: boolean
  className?: string
}

export function PageLoadingIndicator({
  label = "Loading...",
  fixed = true,
  className,
}: PageLoadingIndicatorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none inset-0 z-50 flex items-center justify-center",
        fixed ? "fixed" : "absolute",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  )
}
