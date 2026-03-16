"use client"

import { usePathname } from "next/navigation"
import { MainHeader } from "@/components/main-header"
import Footer from "@/components/footer"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSignUp = pathname === "/sign-up"

  if (isSignUp) {
    return <>{children}</>
  }

  return (
    <>
      <MainHeader />
      <div className="pt-[73px]">{children}</div>
      <Footer />
    </>
  )
}
