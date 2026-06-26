"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const RESEND_COOLDOWN_SEC = 60

export type SignUpVerifyEmailStepProps = {
  userId: string
  email: string
  onBack: () => void
  onVerified: () => void
  backLabel?: string
  verifyLabel?: string
}

export function SignUpVerifyEmailStep({
  userId,
  email,
  onBack,
  onVerified,
  backLabel = "Back",
  verifyLabel = "Verify & finish",
}: SignUpVerifyEmailStepProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const hasSentInitial = useRef(false)

  const sendCode = async () => {
    setIsSending(true)
    try {
      const response = await fetch("/api/auth/signup/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await response.json().catch(() => ({} as Record<string, unknown>))
      const message = typeof data.error === "string" ? data.error : undefined

      if (!response.ok) {
        toast.error("Could not send code", { description: message })
        return
      }

      toast.success("Verification code sent", {
        description: `Check ${email.trim()} for your 6-digit code.`,
      })
      setCooldown(RESEND_COOLDOWN_SEC)
    } catch (error) {
      console.error(error)
      toast.error("Connection failed", {
        description: "Check your network and try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    if (hasSentInitial.current) return
    hasSentInitial.current = true
    void sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const code = digits.join("")

  const handleDigitChange = (index: number, value: string) => {
    const next = value.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const updated = [...prev]
      updated[index] = next
      return updated
    })
    if (next && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (text: string) => {
    const pasted = text.replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = ["", "", "", "", "", ""]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i] ?? ""
    }
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code")
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/auth/signup/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      })
      const data = await response.json().catch(() => ({} as Record<string, unknown>))
      const message = typeof data.error === "string" ? data.error : undefined

      if (!response.ok) {
        toast.error("Verification failed", { description: message })
        return
      }

      toast.success("Email verified")
      onVerified()
    } catch (error) {
      console.error(error)
      toast.error("Connection failed", {
        description: "Check your network and try again.",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg font-ibm-plex-sans mx-auto">
        <h1 className="text-2xl font-medium uppercase font-phudu tracking-tight text-foreground sm:text-3xl">
          Verify your email
        </h1>
        <p className="mt-1 text-base font-regular text-muted-foreground">
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-foreground">{email.trim()}</span>.
        </p>

        <div className="mt-8 flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e.key)}
              onPaste={(e) => {
                e.preventDefault()
                handlePaste(e.clipboardData.getData("text"))
              }}
              className="h-12 w-10 rounded-lg border border-border bg-card text-center text-lg font-semibold text-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green sm:h-14 sm:w-12"
            />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={isSending || cooldown > 0}
            className="font-medium text-brand-green hover:text-brand-green-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : isSending ? "Sending..." : "Resend code"}
          </button>
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            {backLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={isVerifying || code.length !== 6}
            className="w-full rounded-xl bg-brand-green py-3 text-base font-medium text-white shadow-md transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : verifyLabel}
          </button>
        </div>
      </div>
    </>
  )
}
