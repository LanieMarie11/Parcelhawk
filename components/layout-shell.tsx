"use client"

import { usePathname } from "next/navigation"
// TODO : Remove the MainHeader and use the LandingHeader
// import { MainHeader } from "@/components/main-header"
import { LandingHeader } from "@/components/landing-header"
import Footer from "@/components/footer"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSignUp = pathname === "/sign-up"
  const isLandProperty = pathname.endsWith("/land-property")
  const isLandingHome = pathname === "/"

  if (isSignUp) {
    return <>{children}</>
  }

  return (
    <>
      <LandingHeader />
      <div className={`flex min-h-screen flex-col ${isLandingHome ? "pt-[73px]" : "pt-[73px]"}`}>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {!isLandingHome && <Footer className={isLandProperty ? "ml-auto w-1/2" : ""} />}
      </div>
    </>
  )
}
