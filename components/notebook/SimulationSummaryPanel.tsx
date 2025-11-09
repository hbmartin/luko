"use client"

import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"
import { useNotebook } from "./NotebookProvider"

interface SimulationSummaryPanelProperties {
  notebook: Notebook
  result: SimulationResult | null
}

export function SimulationSummaryPanel({ notebook, result }: SimulationSummaryPanelProperties) {
  const { handleRunSimulation, isSimulating } = useNotebook()

  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
      <h3 className="mb-[var(--space-300)] text-lg font-semibold text-[var(--color-text-primary)]">
        Simulation Summary
      </h3>
      {result ? (
        <div className="space-y-4">
          <div className="bg-accent rounded-xl p-4">
            <div className="text-primary text-xs font-semibold tracking-wide uppercase">Median 3-Year NPV</div>
            <div className="text-primary mt-1 text-2xl font-semibold">{formatAbbreviatedNumber(result.npv.p50)}</div>
          </div>

          <div className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payback Period</span>
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
      ) : (
        <div className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-center text-sm text-[var(--color-text-muted)]">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={`bg-primary mx-auto flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white transition-all ${isSimulating ? "cursor-not-allowed opacity-75" : "hover:scale-105"} `}
          >
            {isSimulating ? (
              <>
                <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Running…
              </>
            ) : (
              <>
                <span>Run Simulation</span>
              </>
            )}
          </button>
        </div>
      )}

      {notebook.isDirty && (
        <div className="mt-[var(--space-400)] rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-xs">
          <div className="font-semibold text-yellow-800">Unsynced edits</div>
          <p className="mt-1 text-yellow-700">
            {notebook.dirtyMetrics.length} metric{notebook.dirtyMetrics.length === 1 ? "" : "s"} changed since last
            simulation.
          </p>
        </div>
      )}
    </div>
  )
}
