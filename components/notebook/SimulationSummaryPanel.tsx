"use client"

import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

interface SimulationSummaryPanelProps {
  notebook: Notebook
  result: SimulationResult | null
}

export function SimulationSummaryPanel({ notebook, result }: SimulationSummaryPanelProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)] shadow-sm">
      <h3 className="mb-[var(--space-300)] text-lg font-semibold text-[var(--color-text-primary)]">
        Simulation Summary
      </h3>

      {!result ? (
        <div className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-center text-sm text-[var(--color-text-muted)]">
          <svg
            className="mx-auto mb-2 size-10 text-[var(--color-border-soft)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="font-medium text-[var(--color-text-primary)]">No simulation yet</p>
          <p className="mt-1 text-xs">Update parameters and run the model to populate results.</p>
        </div>
      ) : (
        <div className="space-y-[var(--space-400)]">
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Median 3-Year NPV</div>
            <div className="mt-1 text-2xl font-semibold text-blue-900">
              {formatAbbreviatedNumber(result.npv.p50)}
            </div>
            <p className="mt-1 text-xs text-blue-700/70">Mean: {formatAbbreviatedNumber(result.npv.mean)}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Payback Period</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {result.paybackPeriod.p50.toFixed(1)} months
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Iterations</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {result.metadata.iterations.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Runtime</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {result.metadata.calculationTimeMs} ms
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-soft)] p-3">
            <div className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Confidence Interval</div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
              <div>
                <dt>p90</dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {formatAbbreviatedNumber(result.npv.p90)}
                </dd>
              </div>
              <div>
                <dt>p10</dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {formatAbbreviatedNumber(result.npv.p10)}
                </dd>
              </div>
              <div>
                <dt>p75</dt>
                <dd>{formatAbbreviatedNumber(result.npv.p75)}</dd>
              </div>
              <div>
                <dt>p25</dt>
                <dd>{formatAbbreviatedNumber(result.npv.p25)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {notebook.isDirty && (
        <div className="mt-[var(--space-400)] rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-xs">
          <div className="font-semibold text-yellow-800">Unsynced edits</div>
          <p className="mt-1 text-yellow-700">
            {notebook.dirtyMetrics.length} metric{notebook.dirtyMetrics.length !== 1 ? "s" : ""} changed since
            last simulation.
          </p>
        </div>
      )}
    </div>
  )
}
