"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, X } from "lucide-react"
import BuyerIcon from "@/components/icons/buyer"
import InvestorIcon from "@/components/icons/investor"
import GoogleIcon from "@/components/icons/google-icon"
import { StepProgress } from "@/components/step-progress"
import { SignUpPreferencesStep } from "@/components/sign-up-preferences-step"
import { SignUpCompleteStep } from "@/components/sign-up-complete-step"
import type { SignUpPreferencesData } from "@/components/sign-up-preferences-step"

type Role = "buyer" | "investor"

type SignUpFormProps = {
  onClose?: () => void
}

const STEPS = [
  { number: 1, label: "Create Account" },
  { number: 2, label: "Preferences" },
  { number: 3, label: "Complete" },
] as const

export default function SignUpForm({ onClose }: SignUpFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<Role>("buyer")
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [completedPreferences, setCompletedPreferences] =
    useState<SignUpPreferencesData | null>(null)
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)

  const handleSignUp = async () => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role: selectedRole,
        }),
      })
      const data = await response.json().catch(() => ({} as Record<string, unknown>))
      const message = data.error ?? data.message

      if (response.ok) {
        const userId = typeof data.userId === "string" ? data.userId : null
        if (userId) {
          setCreatedUserId(userId)
        }
        toast.success("Account created", {
          description: "You can sign in with your new account.",
        })
        if (onClose) {
          onClose()
          return
        }
        setCurrentStep(2)
        return
      }

      if (response.status === 409) {
        toast.error("Account already exists", {
          description: message,
        })
        return
      }

      if (response.status === 400) {
        toast.error("Invalid input", { description: message })
        return
      }

      toast.error("Something went wrong", {
        description: "Please try again later.",
      })
    } catch (error) {
      console.error(error)
      toast.error("Connection failed", {
        description: "Check your network and try again.",
      })
    }
  }

  const handleContinueFromPreferences = async (prefs: SignUpPreferencesData) => {
    setCompletedPreferences(prefs)

    if (createdUserId) {
      try {
        await fetch("/api/auth/signup/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: createdUserId,
            budget: prefs.budget,
            purpose: prefs.purpose,
            timeframe: prefs.timeframe,
          }),
        })
      } catch (error) {
        console.error("Failed to save preferences", error)
      }
    }

    setCurrentStep(3)
  }

  const card = (
    <div className="flex w-full max-w-2xl flex-col items-center justify-center py-20">
      <StepProgress
        steps={STEPS}
        currentStep={currentStep}
        className="mb-8"
      />

      {currentStep === 1 && (
        <div className="relative w-full rounded-2xl border border-border bg-card p-8 shadow-lg font-ibm-plex-sans">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Create an account to get started.
          </p>

          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("buyer")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-medium transition-colors ${
                  selectedRole === "buyer"
                    ? "border-[#04C0AF] bg-[#E4FFFD] text-[#096D64]"
                    : "border-border bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <BuyerIcon active={selectedRole === "buyer"} />
                Buyer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("investor")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-medium transition-colors ${
                  selectedRole === "investor"
                    ? "border-[#04C0AF] bg-[#E4FFFD] text-[#096D64]"
                    : "border-border bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <InvestorIcon active={selectedRole === "investor"} />
                Investor
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block font-ibm-plex-sans text-base text-foreground">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block font-ibm-plex-sans text-base text-foreground">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="signupEmail" className="block font-ibm-plex-sans text-base text-foreground">
              Email
            </label>
            <input
              id="signupEmail"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="signupPassword" className="block font-ibm-plex-sans text-base text-foreground">
              Create Password
            </label>
            <div className="relative mt-2">
              <input
                id="signupPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="mt-6 w-full rounded-xl cursor-pointer bg-[#04C0AF] py-3.5 text-base text-white shadow-md transition-colors hover:bg-[#3dbdb5]/80 active:bg-[#35aba3]"
            onClick={handleSignUp}
          >
            Sign Up
          </button>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            {"By signing up, I agree to the "}
            <Link href="/terms" className="font-medium text-[#04C0AF] underline hover:text-[#3dbdb5]">
              Terms of use.
            </Link>
          </p>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-base text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-5 text-center text-base text-muted-foreground">
            {"Already have an account? "}
            <Link href="/" className="font-medium text-[#04C0AF] hover:text-[#3dbdb5]">
              Log In
            </Link>
          </p>
        </div>
      )}

      {currentStep === 2 && (
        <SignUpPreferencesStep
          onBack={() => setCurrentStep(1)}
          onContinue={handleContinueFromPreferences}
          onSkip={() => (onClose ? onClose() : router.push("/"))}
        />
      )}

      {currentStep === 3 && completedPreferences && (
        <SignUpCompleteStep
          firstName={firstName}
          preferences={completedPreferences}
          onExploreListings={() => router.push("/")}
          onGoToDashboard={() => router.push("/dashboard")}
        />
      )}

      {/* Skip for Now - step 1 only (step 2 has its own) */}
      {currentStep === 1 && (
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => (onClose ? onClose() : router.push("/"))}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for Now
          </button>
        </p>
      )}
    </div>
  )
  

  if (onClose) {
    return card
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      {card}
    </div>
  )
}
