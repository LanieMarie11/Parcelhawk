"use client"

import { Check } from "lucide-react"

export type StepItem = {
  number: number
  label: string
}

type StepProgressProps = {
  steps: readonly StepItem[]
  currentStep: number
  /** Optional class for the root container (e.g. same width as card below) */
  className?: string
}

export function StepProgress({
  steps,
  currentStep,
  className = "",
}: StepProgressProps) {
  return (
    <div
      className={`flex w-full items-stretch ${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-label={`Step ${currentStep} of ${steps.length}`}
    >
      {steps.map((step, index) => {
        const isActive = step.number === currentStep
        const isPast = step.number < currentStep
        const isFirst = index === 0
        const isLast = index === steps.length - 1
        const leftLineActive = !isFirst && (steps[index - 1].number <= currentStep)
        const rightLineActive = !isLast && step.number <= currentStep

        return (
          <div
            key={step.number}
            className="flex flex-1 items-center"
            style={{ minWidth: 0 }}
          >
            {/* Left connecting line */}
            {!isFirst && (
              <div
                className={`h-px flex-1 shrink-0 ${leftLineActive ? "bg-[#04C0AF]" : "bg-gray-200"}`}
              />
            )}

            {/* Circle + label */}
            <div className="flex flex-col items-center shrink-0 px-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                  isActive || isPast
                    ? "bg-[#04C0AF] text-white"
                    : "border border-gray-300 bg-white text-gray-500"
                }`}
              >
                {isPast ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-center text-sm ${
                  isActive ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Right connecting line */}
            {!isLast && (
              <div
                className={`h-px flex-1 shrink-0 ${rightLineActive ? "bg-[#04C0AF]" : "bg-gray-200"}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
