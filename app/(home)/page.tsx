import { MainHeader } from "@/components/main-header";
import { LandingHome } from "./components/landing-home";
import { LoginRequiredToast } from "./components/login-required-toast";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <LoginRequiredToast />
      <LandingHome />
    </>
  )
}
