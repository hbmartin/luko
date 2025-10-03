"use client"

import { useMemo, useState } from "react"
import { SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"
import { NPVChart, type NPVSeries } from "../charts/NPVChart"
import { PaybackChart } from "../charts/PaybackChart"
import { TornadoChart } from "../charts/TornadoChart"
import { WaterfallChart } from "../charts/WaterfallChart"

interface ScenarioSummary {
  id: string
  name: string
  result: SimulationResult
  createdAt: string
}

interface ResultsTabProps {
  simulationResult: SimulationResult | null
  scenarios: ScenarioSummary[]
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string | null) => void
  onRenameScenario: (scenarioId: string, name: string) => void
}

const palette = ["#1e40af", "#0f766e", "#9d174d", "#9333ea"]

export function ResultsTab({ simulationResult, scenarios, activeScenarioId, onSelectScenario, onRenameScenario }: ResultsTabProps) {
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState("")

  const activeScenario = useMemo(() => {
    if (!scenarios.length) return null
    if (activeScenarioId) {
      return scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[scenarios.length - 1]
    }
    return scenarios[scenarios.length - 1]
  }, [activeScenarioId, scenarios])

  const comparisonScenarios = scenarios.filter(
    (scenario) => scenario.id !== activeScenario?.id && comparisonIds.includes(scenario.id),
  )

  const chartSeries: NPVSeries[] = useMemo(() => {
    if (!activeScenario) return []
    const base: NPVSeries = {
      id: activeScenario.id,
      label: activeScenario.name,
      color: palette[0],
      data: activeScenario.result.yearlyResults,
    }
    const overlays = comparisonScenarios.map((scenario, index) => ({
      id: scenario.id,
      label: scenario.name,
      color: palette[(index + 1) % palette.length],
      data: scenario.result.yearlyResults,
    }))
    return [base, ...overlays]
  }, [activeScenario, comparisonScenarios])

  if (!simulationResult || !activeScenario) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 size-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No simulation results</h3>
          <p className="mt-2 text-sm text-gray-500">Run a simulation from the Worksheet tab to see results.</p>
        </div>
      </div>
    )
  }

  const compareSummary = comparisonScenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    delta: scenario.result.npv.p50 - activeScenario.result.npv.p50,
    paybackDiff: scenario.result.paybackPeriod.p50 - activeScenario.result.paybackPeriod.p50,
  }))

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Scenario Library</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Select a scenario to drive charts and metrics.</p>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap gap-3">
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenario.id
            const isCompared = comparisonIds.includes(scenario.id)
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelectScenario(scenario.id)}
                className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  {editingScenarioId === scenario.id ? (
                    <input
                      className="rounded border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)] focus-visible:data-[focus=strong]"
                      value={draftName}
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={() => {
                        onRenameScenario(scenario.id, draftName.trim())
                        setEditingScenarioId(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          onRenameScenario(scenario.id, draftName.trim())
                          setEditingScenarioId(null)
                        }
                        if (event.key === "Escape") {
                          event.preventDefault()
                          setEditingScenarioId(null)
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm font-semibold text-[var(--color-text-primary)]"
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                        setEditingScenarioId(scenario.id)
                        setDraftName(scenario.name)
                      }}
                    >
                      {scenario.name}
                    </span>
                  )}
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      className="size-3 rounded border border-[var(--color-border-soft)]"
                      checked={isCompared}
                      onChange={(event) => {
                        setComparisonIds((current) => {
                          if (event.target.checked) {
                            return [...new Set([...current, scenario.id])]
                          }
                          return current.filter((id) => id !== scenario.id)
                        })
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                    Compare
                  </label>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formatAbbreviatedNumber(scenario.result.npv.p50)} median NPV • Payback {scenario.result.paybackPeriod.p50.toFixed(1)} months
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Median NPV (3-Year)</div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatAbbreviatedNumber(activeScenario.result.npv.p50)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            Mean: {formatAbbreviatedNumber(activeScenario.result.npv.mean)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">90% Confidence Interval</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
            {formatAbbreviatedNumber(activeScenario.result.npv.p10)} – {formatAbbreviatedNumber(activeScenario.result.npv.p90)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            Std Dev: {formatAbbreviatedNumber(activeScenario.result.npv.std)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Payback Period</div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
            {activeScenario.result.paybackPeriod.p50.toFixed(1)} months
          </div>
          <div className="mt-1 text-xs text-green-600">Median estimate</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Simulation Details</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
            {activeScenario.result.metadata.iterations.toLocaleString()} iterations
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            Runtime {activeScenario.result.metadata.calculationTimeMs} ms
          </div>
        </div>
      </section>

      {compareSummary.length > 0 && (
        <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Comparison</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {compareSummary.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{entry.name}</div>
                <p className={`mt-1 text-xs ${entry.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                  NPV delta {formatAbbreviatedNumber(entry.delta)}
                </p>
                <p className={`text-xs ${entry.paybackDiff <= 0 ? "text-green-600" : "text-red-500"}`}>
                  Payback {entry.paybackDiff.toFixed(1)} months vs active
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">NPV Over Time</h3>
          <NPVChart series={chartSeries} />
        </div>

        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Category Contributions</h3>
          <WaterfallChart data={activeScenario.result.categoryContributions} />
        </div>

        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Sensitivity Analysis</h3>
          <TornadoChart data={activeScenario.result.sensitivityAnalysis} />
        </div>

        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Payback Timeline</h3>
          <PaybackChart paybackPeriod={activeScenario.result.paybackPeriod} />
        </div>
      </section>

      <footer className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 p-4 text-xs text-[var(--color-text-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            Simulation completed: {new Date(activeScenario.result.metadata.timestamp).toLocaleString()}
          </span>
          <span>Method: Monte Carlo with Beta PERT sampling</span>
        </div>
      </footer>
    </div>
  )
}
