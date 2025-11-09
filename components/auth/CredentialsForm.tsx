"use client"

import { type FormEvent, useState } from "react"

import { MicrosoftSignInButton } from "@/components/auth/MicrosoftSignInButton"

type Credentials = {
  email: string
}

export type CredentialsFormResult = {
  errorMessage?: string | null
  successMessage?: string | null
}

type FeedbackMessage = {
  type: "error" | "success"
  message: string
}

type CredentialsFormProps = {
  submitLabel: string
  submittingLabel: string
  onSubmit: (credentials: Credentials) => Promise<CredentialsFormResult | void>
}

export function CredentialsForm({ submitLabel, submittingLabel, onSubmit }: CredentialsFormProps) {
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email")

    if (typeof email !== "string") {
      setFeedbackMessage({
        type: "error",
        message: "Invalid form submission.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedbackMessage(null)

    try {
      const result = await onSubmit({ email })

      if (result?.errorMessage) {
        setFeedbackMessage({
          type: "error",
          message: result.errorMessage,
        })
        return
      }

      if (result?.successMessage) {
        setFeedbackMessage({
          type: "success",
          message: result.successMessage,
        })
      }
    } catch (error) {
      console.error("Credentials submission failed", error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again."
      setFeedbackMessage({
        type: "error",
        message: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <MicrosoftSignInButton
        onErrorChange={(message) => setFeedbackMessage(message ? { type: "error", message } : null)}
      />

      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
        <span className="h-px flex-1 bg-[var(--color-border-soft)]" />
        <span>Or continue with email</span>
        <span className="h-px flex-1 bg-[var(--color-border-soft)]" />
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="focus-visible:ring-primary/40 block w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm transition outline-none focus-visible:ring-2"
            placeholder="you@example.com"
          />
        </div>

        {feedbackMessage ? (
          <p
            className={`text-sm ${
              feedbackMessage.type === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
            }`}
          >
            {feedbackMessage.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </div>
  )
}
