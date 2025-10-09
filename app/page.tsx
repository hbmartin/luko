import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Value Impact Calculator - ROI Analysis Tool",
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Value Impact Calculator</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            ROI analysis toolkit for executive-ready decisions
          </p>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="relative mb-12 overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] px-8 py-12 text-center shadow-xl">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_28%,transparent)_0%,transparent_70%)]" />
            <span className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_oklch,var(--color-primary)_20%,transparent)] bg-[color-mix(in_oklch,var(--color-primary)_12%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Monte Carlo NPV engine
            </span>
            <h2 className="mt-6 text-balance text-4xl font-semibold text-[var(--color-text-primary)] sm:text-5xl">
              ROI analysis made simple
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-muted)]">
              Build credible business cases with Monte Carlo simulation. Model uncertainty, visualize
              outcomes, and share interactive scenarios with stakeholders.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/notebook/1"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)]"
              >
                Open notebook
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-[color-mix(in_oklch,var(--color-primary)_20%,transparent)] bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[color-mix(in_oklch,var(--color-primary)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)]"
                scroll
              >
                Explore features
              </Link>
            </div>
          </div>

          <div className="mb-10 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-8 shadow-lg">
            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  AI ROI analysis &mdash; DevOps automation
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Monte Carlo NPV analysis for AI implementation
                </p>
              </div>
              <Link
                href="/notebook/1"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-elevated)]"
              >
                Launch interactive model
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[color-mix(in_oklch,var(--color-surface-muted)_92%,transparent)] p-4">
                <div className="text-sm text-[var(--color-text-muted)]">Categories</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">6</div>
              </div>
              <div className="rounded-2xl bg-[color-mix(in_oklch,var(--color-surface-muted)_92%,transparent)] p-4">
                <div className="text-sm text-[var(--color-text-muted)]">Metrics</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">18</div>
              </div>
              <div className="rounded-2xl bg-[color-mix(in_oklch,var(--color-surface-muted)_92%,transparent)] p-4">
                <div className="text-sm text-[var(--color-text-muted)]">Status</div>
                <div className="mt-1 text-sm font-medium text-[var(--color-success)]">Ready to run</div>
              </div>
            </div>
          </div>

          <div id="features" className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="group rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--color-primary)_18%,transparent)] text-[var(--color-primary)] transition group-hover:scale-105">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
                Monte Carlo simulation
              </h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                100,000 iterations with Beta PERT distributions to model uncertainty and risk.
              </p>
            </div>

            <div className="group rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--color-success)_18%,transparent)] text-[var(--color-success)] transition group-hover:scale-105">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
                Rich visualizations
              </h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                NPV curves, waterfall charts, tornado diagrams, and payback analysis at a glance.
              </p>
            </div>

            <div className="group rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--color-info)_18%,transparent)] text-[var(--color-info)] transition group-hover:scale-105">
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
                Interactive editing
              </h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                Inline editing with real-time dirty state tracking and change management.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-[var(--color-text-muted)]">
          Value Impact Calculator &mdash; Built with Next.js 15 and React Data Grid
        </div>
      </footer>
    </div>
  )
}
