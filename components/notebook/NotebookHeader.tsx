"use client"

import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

interface NotebookHeaderProps {
  notebook: Notebook
  simulationResult: SimulationResult | null
  onRunSimulation: () => void
  isSimulating: boolean
  onToggleTheme: () => void
  onToggleDensity: () => void
  theme: "light" | "dark"
  density: "comfortable" | "compact"
}

export function NotebookHeader({
  notebook,
  simulationResult,
  onRunSimulation,
  isSimulating,
  onToggleTheme,
  onToggleDensity,
  theme,
  density,
}: NotebookHeaderProps) {
  return (
    <header className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] shadow-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-[var(--space-500)] py-[var(--space-400)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Monte Carlo Workbook
            </div>
            {notebook.isDirty && (
              <div className="flex items-center gap-2 text-xs font-medium text-yellow-700">
                <span className="size-2 rounded-full bg-yellow-400" />
                {notebook.dirtyMetrics.length} pending change
                {notebook.dirtyMetrics.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-[var(--color-text-primary)]">
                {notebook.name}
              </h1>
              {notebook.description && (
                <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
                  {notebook.description}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-[var(--color-text-muted)]">
              <div>
                <dt className="text-xs uppercase tracking-wide">Categories</dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {notebook.categories.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Metrics</dt>
                <dd className="font-medium text-[var(--color-text-primary)]">{notebook.metrics.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Last updated</dt>
                <dd>{new Date(notebook.updatedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Simulation status</dt>
                <dd className="font-medium text-[var(--color-text-primary)]">
                  {simulationResult
                    ? formatAbbreviatedNumber(simulationResult.npv.p50)
                    : "Not yet run"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-[var(--space-200)]">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={onToggleTheme}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition"
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full ${
                  theme === "dark" ? "bg-blue-500 text-white" : "bg-white text-blue-600"
                }`}
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </span>
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <div className="h-6 w-px bg-[var(--color-border-soft)]" />
            <button
              type="button"
              aria-label="Toggle density"
              onClick={onToggleDensity}
              className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition"
            >
              <span
                className={`inline-flex size-5 items-center justify-center rounded-full ${
                  density === "compact" ? "bg-blue-500 text-white" : "bg-white text-blue-600"
                }`}
              >
                {density === "compact" ? "≡" : "☰"}
              </span>
              {density === "compact" ? "Compact" : "Comfort"}
            </button>
          </div>

          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className={`
              flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors
              ${isSimulating ? "cursor-not-allowed opacity-75" : "hover:bg-blue-700"}
            `}
          >
            {isSimulating ? (
              <>
                <svg
                  className="size-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
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
      </div>
    </header>
  )
}
