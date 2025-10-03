"use client"

import { useEffect, useMemo, useState } from "react"
import { runSimulation } from "@/lib/simulation/runSimulation"
import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { NotebookHeader } from "./NotebookHeader"
import { ExportTab } from "./tabs/ExportTab"
import { ResultsTab } from "./tabs/ResultsTab"
import { WorksheetTab } from "./tabs/WorksheetTab"

interface NotebookLayoutProps {
  notebook: Notebook
}

type TabType = "worksheet" | "results" | "export"

interface Scenario {
  id: string
  name: string
  result: SimulationResult
  createdAt: string
}

export function NotebookLayout({ notebook: initialNotebook }: NotebookLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("worksheet")
  const [notebook, setNotebook] = useState<Notebook>(initialNotebook)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable")
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  const handleRenameScenario = (scenarioId: string, name: string) => {
    setScenarios((prev) =>
      prev.map((scenario) => (scenario.id === scenarioId ? { ...scenario, name: name || scenario.name } : scenario)),
    )
  }

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    root.setAttribute("data-theme", theme)
    root.setAttribute("data-density", density)
  }, [theme, density])

  const handleRunSimulation = async () => {
    setIsSimulating(true)
    const start = performance.now()
    const result = await runSimulation(notebook)
    const elapsed = Math.round(performance.now() - start)
    const augmentedResult: SimulationResult = {
      ...result,
      metadata: {
        ...result.metadata,
        calculationTimeMs: elapsed,
      },
    }

    setSimulationResult(augmentedResult)
    const scenarioId = `scenario-${Date.now()}`
    setScenarios((prev) => {
      const scenario: Scenario = {
        id: scenarioId,
        name: `Scenario ${prev.length + 1}`,
        result: augmentedResult,
        createdAt: augmentedResult.metadata.timestamp,
      }
      setActiveScenarioId(scenarioId)
      return [...prev, scenario]
    })
    setNotebook((prev) => ({
      ...prev,
      isDirty: false,
      dirtyMetrics: [],
      lastSimulationId: scenarioId,
    }))

    setIsSimulating(false)
    setActiveTab("results")
  }

  const navigationItems = useMemo(
    () => [
      {
        id: "worksheet" as const,
        label: "Worksheet",
        description: "Edit assumptions and configure distributions",
        badge: `${notebook.metrics.length} metrics`,
      },
      {
        id: "results" as const,
        label: "Results",
        description: "View NPV ranges and sensitivity insights",
        badge: simulationResult ? "Ready" : "Pending",
      },
      {
        id: "export" as const,
        label: "Export",
        description: "Configure branded deliverables",
        badge: "Beta",
      },
    ],
    [notebook.metrics.length, simulationResult],
  )

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      <NotebookHeader
        notebook={notebook}
        simulationResult={simulationResult}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleDensity={() =>
          setDensity((current) => (current === "comfortable" ? "compact" : "comfortable"))
        }
        theme={theme}
        density={density}
      />
      <div className="flex flex-1">
        <aside className="hidden w-72 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]/60 px-[var(--space-400)] py-[var(--space-500)] lg:flex">
          <div className="mb-[var(--space-500)] rounded-2xl bg-[var(--color-surface-elevated)] p-[var(--space-400)] shadow-sm">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Simulation health</h2>
            <dl className="mt-[var(--space-300)] space-y-3 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center justify-between">
                <dt>Dirty metrics</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">
                  {notebook.dirtyMetrics.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Last simulation</dt>
                <dd>
                  {simulationResult
                    ? new Date(simulationResult.metadata.timestamp).toLocaleString()
                    : "Pending"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Iterations</dt>
                <dd>
                  {simulationResult
                    ? simulationResult.metadata.iterations.toLocaleString()
                    : "–"}
                </dd>
              </div>
            </dl>
          </div>

          <nav aria-label="Notebook sections" className="flex-1 space-y-2">
            {navigationItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  disabled={item.id === "results" && !simulationResult}
                  className={`w-full rounded-2xl border px-[var(--space-400)] py-[var(--space-300)] text-left transition ${
                    isActive
                      ? "border-blue-400 bg-white shadow-sm"
                      : "border-transparent bg-[var(--color-surface-elevated)]/60 hover:border-[var(--color-border-soft)]"
                  } ${
                    item.id === "results" && !simulationResult
                      ? "cursor-not-allowed opacity-70"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isActive ? "text-blue-700" : "text-[var(--color-text-primary)]"}`}>
                      {item.label}
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.description}</p>
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto px-[var(--space-500)] py-[var(--space-500)]">
            {activeTab === "worksheet" && (
              <WorksheetTab
                notebook={notebook}
                onNotebookChange={setNotebook}
                density={density}
                simulationResult={simulationResult}
              />
            )}
            {activeTab === "results" && (
              <ResultsTab
                simulationResult={simulationResult}
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                onSelectScenario={setActiveScenarioId}
                onRenameScenario={handleRenameScenario}
              />
            )}
            {activeTab === "export" && <ExportTab />}
          </main>
        </section>
      </div>
    </div>
  )
}
