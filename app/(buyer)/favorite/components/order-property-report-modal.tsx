"use client"

import { Download, FileText, Loader2, X } from "lucide-react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useEffect, useId, useState } from "react"
import type { ParcelResearchReport } from "@/lib/property-reports/build-parcel-research-report"
import { PROPERTY_REPORT_PRICE_CENTS } from "@/lib/property-reports/constants"
import {
  downloadPropertyReportDocx,
  downloadPropertyReportMarkdown,
} from "./property-report-document"

const BUYER_PROPERTY_REPORTS_PATH = "/api/buyer/property-reports"
const BUYER_PROPERTY_REPORT_PAYMENT_PATH = "/api/buyer/property-reports/payment-intent"
const REPORT_PRICE_LABEL = `$${(PROPERTY_REPORT_PRICE_CENTS / 100).toFixed(2)}`

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export type PropertyReportResponse = {
  ok: true
  listingId: number
  report: ParcelResearchReport
  generatedAt: string
  cached: boolean
}

type PaymentIntentResponse = {
  clientSecret: string | null
  paymentIntentId: string
  amountCents?: number
  alreadyPaid?: boolean
  error?: string
}

function parsePropertyReportResponse(data: unknown): PropertyReportResponse {
  const payload = data as PropertyReportResponse & { error?: string }

  if (
    payload.ok !== true ||
    typeof payload.listingId !== "number" ||
    !("report" in payload) ||
    typeof payload.generatedAt !== "string" ||
    typeof payload.cached !== "boolean"
  ) {
    throw new Error("Invalid response from server")
  }

  return {
    ok: true,
    listingId: payload.listingId,
    report: payload.report,
    generatedAt: payload.generatedAt,
    cached: payload.cached,
  }
}

async function fetchExistingPropertyReport(listingId: number): Promise<PropertyReportResponse | null> {
  const res = await fetch(`${BUYER_PROPERTY_REPORTS_PATH}?listingId=${listingId}`)
  const data = (await res.json().catch(() => ({}))) as PropertyReportResponse & {
    error?: string
    needsPayment?: boolean
  }

  if (res.ok) {
    return parsePropertyReportResponse(data)
  }

  if (res.status === 404 && data.needsPayment) {
    return null
  }

  throw new Error(typeof data.error === "string" ? data.error : "Request failed")
}

async function createPropertyReportPaymentIntent(listingId: number): Promise<PaymentIntentResponse> {
  const res = await fetch(BUYER_PROPERTY_REPORT_PAYMENT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  })
  const data = (await res.json().catch(() => ({}))) as PaymentIntentResponse

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to start payment")
  }

  return data
}

async function generatePropertyReport(
  listingId: number,
  paymentIntentId?: string,
): Promise<PropertyReportResponse> {
  const res = await fetch(BUYER_PROPERTY_REPORTS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, paymentIntentId }),
  })
  const data = (await res.json().catch(() => ({}))) as PropertyReportResponse & {
    error?: string
    refunded?: boolean
  }

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed")
  }

  return parsePropertyReportResponse(data)
}

export type OrderPropertyReportModalProps = {
  open: boolean
  onClose: () => void
  listingId: number
  /** Shown under the main title (e.g. listing name). */
  propertySubtitle: string
}

type ModalStep =
  | { step: "loading" }
  | { step: "confirm_payment" }
  | { step: "payment"; clientSecret: string; paymentIntentId: string }
  | { step: "generating" }
  | { step: "success"; data: PropertyReportResponse }
  | { step: "error"; message: string }

function PropertyReportPaymentForm({
  paymentIntentId,
  onPaid,
  onError,
}: {
  paymentIntentId: string
  onPaid: (confirmedPaymentIntentId: string) => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!stripe || !elements || isSubmitting) return

        setIsSubmitting(true)
        void stripe
          .confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: {
              return_url: window.location.href,
            },
          })
          .then(({ error, paymentIntent }) => {
            if (error) {
              onError(error.message ?? "Payment failed")
              return
            }

            const intentId = paymentIntent?.id ?? paymentIntentId
            if (!intentId) {
              onError("Payment could not be confirmed")
              return
            }

            onPaid(intentId)
          })
          .finally(() => {
            setIsSubmitting(false)
          })
      }}
    >
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="w-full rounded-lg bg-brand-green py-2.5 text-sm font-ibm-plex-sans font-medium text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Processing payment..." : `Pay ${REPORT_PRICE_LABEL}`}
      </button>
    </form>
  )
}

export function OrderPropertyReportModal({
  open,
  onClose,
  listingId,
  propertySubtitle,
}: OrderPropertyReportModalProps) {
  const titleId = useId()
  const [modalStep, setModalStep] = useState<ModalStep>({ step: "loading" })
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false)
  const [isStartingPayment, setIsStartingPayment] = useState(false)

  useEffect(() => {
    if (!open) {
      setModalStep({ step: "loading" })
      setIsStartingPayment(false)
      return
    }

    let cancelled = false
    setModalStep({ step: "loading" })

    void fetchExistingPropertyReport(listingId)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setModalStep({ step: "success", data })
          return
        }
        setModalStep({ step: "confirm_payment" })
      })
      .catch((error) => {
        if (!cancelled) {
          setModalStep({
            step: "error",
            message: error instanceof Error ? error.message : "Failed to load property report",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, listingId])

  const startPayment = () => {
    if (isStartingPayment) return
    setIsStartingPayment(true)

    void createPropertyReportPaymentIntent(listingId)
      .then(async (payment) => {
        if (payment.alreadyPaid) {
          setModalStep({ step: "generating" })
          const data = await generatePropertyReport(listingId, payment.paymentIntentId)
          setModalStep({ step: "success", data })
          return
        }

        if (!payment.clientSecret) {
          throw new Error("Payment could not be initialized")
        }

        setModalStep({
          step: "payment",
          clientSecret: payment.clientSecret,
          paymentIntentId: payment.paymentIntentId,
        })
      })
      .catch((error) => {
        setModalStep({
          step: "error",
          message: error instanceof Error ? error.message : "Failed to start payment",
        })
      })
      .finally(() => {
        setIsStartingPayment(false)
      })
  }

  if (!open) return null

  const reportData = modalStep.step === "success" ? modalStep.data : null

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="bg-brand-green px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-white/10"
              aria-hidden
            >
              <FileText className="h-5 w-5" strokeWidth={2} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/10 transition-colors hover:bg-white/30"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="mt-5 min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold font-ibm-plex-sans leading-tight tracking-tight text-white"
            >
              Order Property Report
            </h2>
            <p className="mt-1.5 truncate text-sm font-regular font-ibm-plex-sans leading-snug text-white/95">
              {propertySubtitle}
            </p>
          </div>
        </div>

        {reportData ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              disabled={isDownloadingDocx}
              onClick={() => {
                setIsDownloadingDocx(true)
                void downloadPropertyReportDocx(
                  reportData.report,
                  propertySubtitle,
                  reportData.listingId,
                  new Date(reportData.generatedAt),
                )
                  .catch(() => {
                    window.alert("Failed to download DOCX report. Please try again.")
                  })
                  .finally(() => {
                    setIsDownloadingDocx(false)
                  })
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-medium font-ibm-plex-sans text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloadingDocx ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-4 w-4" aria-hidden />
              )}
              Download report (.docx)
            </button>
            <button
              type="button"
              onClick={() =>
                downloadPropertyReportMarkdown(
                  reportData.report,
                  propertySubtitle,
                  reportData.listingId,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium font-ibm-plex-sans text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download report (.md)
            </button>
          </div>
        ) : null}

        <div className="p-4">
          {modalStep.step === "loading" || modalStep.step === "generating" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {modalStep.step === "generating"
                  ? "Generating property report..."
                  : "Checking property report..."}
              </p>
            </div>
          ) : null}

          {modalStep.step === "confirm_payment" ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <p className="text-sm font-semibold text-zinc-900">One-time report purchase</p>
                <p className="mt-2 text-sm font-ibm-plex-sans leading-relaxed text-zinc-600">
                  This property report costs{" "}
                  <span className="font-semibold text-zinc-900">{REPORT_PRICE_LABEL}</span> per
                  listing. After payment, you can reopen this report anytime at no extra charge.
                </p>
              </div>
              <button
                type="button"
                onClick={startPayment}
                disabled={isStartingPayment || !stripePromise}
                className="w-full rounded-lg bg-brand-green py-2.5 text-sm font-ibm-plex-sans font-medium text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingPayment ? "Preparing payment..." : `Continue to pay ${REPORT_PRICE_LABEL}`}
              </button>
              {!stripePromise ? (
                <p className="text-center text-xs text-red-600">Payments are not configured.</p>
              ) : null}
            </div>
          ) : null}

          {modalStep.step === "payment" && stripePromise ? (
            <div className="py-2">
              <p className="mb-4 text-sm font-ibm-plex-sans text-zinc-600">
                Secure checkout powered by Stripe.
              </p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: modalStep.clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <PropertyReportPaymentForm
                  paymentIntentId={modalStep.paymentIntentId}
                  onPaid={(confirmedPaymentIntentId) => {
                    setModalStep({ step: "generating" })
                    void generatePropertyReport(listingId, confirmedPaymentIntentId)
                      .then((data) => {
                        setModalStep({ step: "success", data })
                      })
                      .catch((error) => {
                        setModalStep({
                          step: "error",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Failed to generate property report",
                        })
                      })
                  }}
                  onError={(message) => {
                    setModalStep({ step: "error", message })
                  }}
                />
              </Elements>
            </div>
          ) : null}

          {modalStep.step === "success" ? (
            <div className="rounded-xl border border-emerald-200/90 bg-[#EDFCEA] px-3.5 py-3">
              <p className="text-sm font-semibold text-[#2D5A36]">
                {modalStep.data.cached ? "Saved property report loaded" : "Property report ready"}
              </p>
              <p className="mt-1 text-xs font-ibm-plex-sans leading-relaxed text-[#4b5563]">
                Report for listing ID{" "}
                <span className="font-medium">{modalStep.data.listingId}</span>
                {modalStep.data.generatedAt ? (
                  <>
                    {" "}
                    · Generated {new Date(modalStep.data.generatedAt).toLocaleString()}
                  </>
                ) : null}
                .
              </p>
              <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-white/80 p-3 text-xs text-[#374151]">
                {JSON.stringify(modalStep.data.report, null, 2)}
              </pre>
            </div>
          ) : null}

          {modalStep.step === "error" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <p className="text-sm font-semibold text-[#B3261E]">Request failed</p>
              <p className="mt-1 text-xs font-ibm-plex-sans leading-relaxed text-[#7f1d1d]">
                {modalStep.message}
              </p>
            </div>
          ) : null}

          <div className="pt-6 pb-4">
            <button
              type="button"
              onClick={onClose}
              disabled={
                modalStep.step === "loading" ||
                modalStep.step === "generating" ||
                isStartingPayment
              }
              className="w-full rounded-lg bg-brand-green py-2.5 text-sm font-ibm-plex-sans font-medium text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
