"use client"

import dynamic from "next/dynamic"
import { type ChangeEvent, type KeyboardEvent, memo, type MouseEvent, useCallback, useMemo, useState } from "react"
import { SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"
import type { NPVSeries } from "../charts/NPVChart"
import { useNotebookActions, useNotebookSelector } from "../NotebookProvider"

interface ScenarioSummary {
  id: string
  name: string
  result: SimulationResult
  createdAt: string
}

interface ResultsTabProperties {
  simulationResult: SimulationResult | null
  scenarios: ScenarioSummary[]
  activeScenarioId: string | null
  onSelectScenario: (scenarioId: string | null) => void
  onRenameScenario: (scenarioId: string, name: string) => void
}

const primaryColor = "#1e40af"
const palette = [primaryColor, "#0f766e", "#9d174d", "#9333ea"]

type NPVChartProperties = { series: NPVSeries[] }
type PaybackChartProperties = { paybackPeriod: SimulationResult["paybackPeriod"] }
type TornadoChartProperties = { data: SimulationResult["sensitivityAnalysis"] }
type WaterfallChartProperties = { data: SimulationResult["categoryContributions"] }

const loadNPVChart = async () => {
  const chartModule = await import("../charts/NPVChart.js")
  return chartModule.NPVChart
}

const loadPaybackChart = async () => {
  const chartModule = await import("../charts/PaybackChart.js")
  return chartModule.PaybackChart
}

const loadTornadoChart = async () => {
  const chartModule = await import("../charts/TornadoChart.js")
  return chartModule.TornadoChart
}

const loadWaterfallChart = async () => {
  const chartModule = await import("../charts/WaterfallChart.js")
  return chartModule.WaterfallChart
}

const NPVChart = dynamic<NPVChartProperties>(loadNPVChart, {
  ssr: false,
})
const PaybackChart = dynamic<PaybackChartProperties>(loadPaybackChart, {
  ssr: false,
})
const TornadoChart = dynamic<TornadoChartProperties>(loadTornadoChart, {
  ssr: false,
})
const WaterfallChart = dynamic<WaterfallChartProperties>(loadWaterfallChart, {
  ssr: false,
})

interface ScenarioCardProperties {
  draftName: string
  isActive: boolean
  isCompared: boolean
  isEditing: boolean
  onBeginRename: (scenario: ScenarioSummary) => void
  onCancelRename: () => void
  onCommitRename: (scenarioId: string) => void
  onDraftNameChange: (name: string) => void
  onSelectScenario: (scenarioId: string) => void
  onToggleCompare: (scenarioId: string, checked: boolean) => void
  scenario: ScenarioSummary
}

const ScenarioCard = memo(function ScenarioCard({
  draftName,
  isActive,
  isCompared,
  isEditing,
  onBeginRename,
  onCancelRename,
  onCommitRename,
  onDraftNameChange,
  onSelectScenario,
  onToggleCompare,
  scenario,
}: ScenarioCardProperties) {
  const handleBeginRename = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onBeginRename(scenario)
    },
    [onBeginRename, scenario]
  )
  const handleCommitRename = useCallback(() => {
    onCommitRename(scenario.id)
  }, [onCommitRename, scenario.id])
  const handleDraftNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onDraftNameChange(event.target.value)
    },
    [onDraftNameChange]
  )
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        onCommitRename(scenario.id)
      }
      if (event.key === "Escape") {
        event.preventDefault()
        onCancelRename()
      }
    },
    [onCancelRename, onCommitRename, scenario.id]
  )
  const handleSelectScenario = useCallback(() => {
    onSelectScenario(scenario.id)
  }, [onSelectScenario, scenario.id])
  const handleToggleCompare = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onToggleCompare(scenario.id, event.target.checked)
    },
    [onToggleCompare, scenario.id]
  )

  return (
    <div
      className={`min-w-[180px] rounded-md border px-4 py-3 text-left transition ${
        isActive
          ? "border-blue-500 bg-blue-50"
          : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] hover:border-blue-300"
      }`}
    >
      <div className="flex items-center justify-between">
        {isEditing ? (
          <input
            aria-label="Scenario name"
            className="rounded border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none"
            value={draftName}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onChange={handleDraftNameChange}
            onBlur={handleCommitRename}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button
            type="button"
            className="min-w-0 truncate text-left text-sm font-semibold text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none"
            onClick={handleSelectScenario}
            onDoubleClick={handleBeginRename}
          >
            {scenario.name}
          </button>
        )}
        <label className="flex items-center gap-2 text-[10px] tracking-wide text-[var(--color-text-muted)] uppercase">
          <input
            type="checkbox"
            className="size-3 rounded border border-[var(--color-border-soft)]"
            checked={isCompared}
            onChange={handleToggleCompare}
          />
          Compare
        </label>
      </div>
      <button
        type="button"
        className="mt-1 block text-left text-xs text-[var(--color-text-muted)] tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none"
        onClick={handleSelectScenario}
      >
        {formatAbbreviatedNumber(scenario.result.npv.p50)} median NPV • Payback{" "}
        {scenario.result.paybackPeriod.p50.toFixed(1)} months
      </button>
    </div>
  )
})

export function ResultsTab({
  simulationResult,
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onRenameScenario,
}: ResultsTabProperties) {
  const isSimulating = useNotebookSelector((state) => state.isSimulating)
  const simulationError = useNotebookSelector((state) => state.simulationError)
  const { handleRunSimulation } = useNotebookActions()

  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState("")

  const activeScenario = useMemo(() => {
    if (scenarios.length === 0) return null
    if (activeScenarioId) {
      return scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios.at(-1)
    }
    return scenarios.at(-1)
  }, [activeScenarioId, scenarios])

  const comparisonScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.id !== activeScenario?.id && comparisonIds.includes(scenario.id)),
    [activeScenario?.id, comparisonIds, scenarios]
  )

  const chartSeries: NPVSeries[] = useMemo(() => {
    if (!activeScenario) return []
    const base: NPVSeries = {
      id: activeScenario.id,
      label: activeScenario.name,
      color: primaryColor,
      data: activeScenario.result.yearlyResults,
    }
    const overlays = comparisonScenarios.map((scenario, index) => ({
      id: scenario.id,
      label: scenario.name,
      color: String(palette[(index + 1) % palette.length]),
      data: scenario.result.yearlyResults,
    }))
    return [base, ...overlays]
  }, [activeScenario, comparisonScenarios])

  const runSimulation = useCallback(() => {
    void handleRunSimulation()
  }, [handleRunSimulation])
  const beginRenameScenario = useCallback((scenario: ScenarioSummary) => {
    setEditingScenarioId(scenario.id)
    setDraftName(scenario.name)
  }, [])
  const cancelRenameScenario = useCallback(() => {
    setEditingScenarioId(null)
  }, [])
  const commitRenameScenario = useCallback(
    (scenarioId: string) => {
      onRenameScenario(scenarioId, draftName.trim())
      setEditingScenarioId(null)
    },
    [draftName, onRenameScenario]
  )
  const updateDraftName = useCallback((name: string) => {
    setDraftName(name)
  }, [])
  const toggleScenarioComparison = useCallback((scenarioId: string, checked: boolean) => {
    setComparisonIds((current) => {
      if (checked) {
        return [...new Set([...current, scenarioId])]
      }
      return current.filter((id) => id !== scenarioId)
    })
  }, [])

  if (!simulationResult || !activeScenario || isSimulating) {
    return (
      <div className="flex h-full items-center justify-center" aria-live="polite">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 size-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
            {isSimulating ? "Running Simulation…" : "No Simulation Yet"}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Run the current notebook snapshot to generate scenario charts.
          </p>
          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating}
            className="bg-primary text-primary-foreground mt-5 inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulating ? "Running…" : "Run Simulation"}
          </button>
          {simulationError ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {simulationError}
            </p>
          ) : undefined}
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
              <ScenarioCard
                key={scenario.id}
                draftName={draftName}
                isActive={isActive}
                isCompared={isCompared}
                isEditing={editingScenarioId === scenario.id}
                scenario={scenario}
                onBeginRename={beginRenameScenario}
                onCancelRename={cancelRenameScenario}
                onCommitRename={commitRenameScenario}
                onDraftNameChange={updateDraftName}
                onSelectScenario={onSelectScenario}
                onToggleCompare={toggleScenarioComparison}
              />
            )
          })}
        </div>
      </section>

      {simulationError ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {simulationError}
        </p>
      ) : undefined}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Median NPV (3-Year)</div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
            {formatAbbreviatedNumber(activeScenario.result.npv.p50)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            Mean: {formatAbbreviatedNumber(activeScenario.result.npv.mean)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">90% Confidence Interval</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)] tabular-nums">
            {formatAbbreviatedNumber(activeScenario.result.npv.p10)} –{" "}
            {formatAbbreviatedNumber(activeScenario.result.npv.p90)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            Std Dev: {formatAbbreviatedNumber(activeScenario.result.npv.std)}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Payback Period</div>
          <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">
            {activeScenario.result.paybackPeriod.p50.toFixed(1)} months
          </div>
          <div className="mt-1 text-xs text-green-600">Median estimate</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="text-sm text-[var(--color-text-muted)]">Simulation Details</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text-primary)] tabular-nums">
            {activeScenario.result.metadata.iterations.toLocaleString()} iterations
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)] tabular-nums">
            Runtime {activeScenario.result.metadata.calculationTimeMs} ms
          </div>
        </div>
      </section>

      {compareSummary.length > 0 && (
        <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Comparison</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {compareSummary.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{entry.name}</div>
                <p className={`mt-1 text-xs tabular-nums ${entry.delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                  NPV delta {formatAbbreviatedNumber(entry.delta)}
                </p>
                <p className={`text-xs tabular-nums ${entry.paybackDiff <= 0 ? "text-green-600" : "text-red-500"}`}>
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
          <span className="tabular-nums">
            Simulation completed: {new Date(activeScenario.result.metadata.timestamp).toLocaleString()}
          </span>
          <span>Method: Monte Carlo with Beta PERT sampling</span>
        </div>
      </footer>
    </div>
  )
}
