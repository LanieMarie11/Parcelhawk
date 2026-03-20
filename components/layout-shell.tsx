"use client"

import { usePathname } from "next/navigation"
import { MainHeader } from "@/components/main-header"
import Footer from "@/components/footer"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSignUp = pathname === "/sign-up"
  const isLandProperty = pathname.endsWith("/land-property")

  if (isSignUp) {
    return <>{children}</>
  }

  return (
    <>
      <MainHeader />
      <div className="pt-[73px]">{children}</div>
      <Footer className={isLandProperty ? "ml-auto w-1/2" : ""} />
    </>
  )
}
