"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, X } from "lucide-react"
import BuyerIcon from "@/components/icons/buyer"
import InvestorIcon from "@/components/icons/investor"
import GoogleIcon from "@/components/icons/google-icon"
import { toast } from "sonner"

type Role = "buyer" | "investor"

type SignInFormProps = {
  onClose?: () => void
}

export default function SignInForm({ onClose }: SignInFormProps) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role>("buyer")
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignIn = async () => {
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        role: selectedRole,
        redirect: false,
      })

      if (result?.ok) {
        toast.success("Signed in successfully", {
          description: "You can continue to the app.",
        })
        if (selectedRole === "investor") {
          router.push("/realtor-portal")
        }
        onClose?.()
        return
      }

      if (result?.error === "CredentialsSignin" || result?.status === 401) {
        toast.error("Invalid email or password", {
          description: "Please check your credentials and try again.",
        })
        return
      }

      toast.error("Something went wrong", {
        description: result?.error ?? "Please try again later.",
      })
    } catch (error) {
      console.error(error)
      toast.error("Connection failed", {
        description: "Check your network and try again.",
      })
    }
  }

  const card = (
    <div className="relative w-full max-w-2xl rounded-2xl bg-card p-10 shadow-lg font-ibm-plex-sans">
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
        {/* Header */}
        <h1 className="text-3xl font-phudu font-medium uppercase tracking-wide text-foreground">
          Sign In And Continue
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Sign in to your account to continue.
        </p>

        {/* Role Selector */}
        <div className="mt-6">
          <p className="text-base font-phudu font-medium uppercase tracking-wide text-foreground">
            Select Your Role
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole("buyer")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-16 py-3 text-base font-medium transition-colors ${
                selectedRole === "buyer"
                  ? "border-[#04C0AF]! bg-[#E4FFFD] text-[#096D64]"
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
                  ? "border-[#04C0AF]! bg-[#E4FFFD] text-[#096D64]"
                  : "border-border bg-card text-muted-foreground hover:border-border"
              }`}
            >
              <InvestorIcon active={selectedRole === "investor"} />
              Investor
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="mt-6">
          <label
            htmlFor="email"
            className="block font-ibm-plex-sans text-base text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
          />
        </div>

        {/* Password */}
        <div className="mt-4">
          <label
            htmlFor="password"
            className="block font-ibm-plex-sans text-base text-foreground"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="password"
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
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="mt-2 text-right">
            <a
              href="#"
              className="text-base text-[#4ECDC4] hover:text-[#3dbdb5]"
            >
              Forgot Password?
            </a>
          </div>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          className="mt-4 w-full rounded-xl cursor-pointer bg-[#04C0AF] hover:bg-[#3dbdb5]/80 active:bg-[#35aba3] py-3.5 text-lg text-white shadow-md transition-colors"
          onClick={handleSignIn}
        >
          Continue
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-base text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Google Button */}
        <button
          type="button"
          className="flex w-full items-center text-md justify-center gap-2 rounded-lg border border-border bg-card py-3 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Sign Up Link */}
        <p className="mt-5 text-center text-base text-muted-foreground">
          {"Don't have an account? "}
          <a
            href="#"
            className="text-[#4ECDC4] hover:text-[#04C0AF]"
          >
            Join For Free
          </a>
        </p>
      </div>
  )

  if (onClose) {
    return card
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      {card}
    </div>
  )
}
