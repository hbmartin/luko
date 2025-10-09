"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { runSimulation } from "@/lib/simulation/runSimulation"

interface Scenario {
  id: string
  name: string
  result: SimulationResult
  createdAt: string
}

interface NotebookContextType {
  notebook: Notebook
  setNotebook: (notebook: Notebook) => void
  simulationResult: SimulationResult | null
  setSimulationResult: (result: SimulationResult | null) => void
  isSimulating: boolean
  theme: "light" | "dark"
  setTheme: (theme: "light" | "dark") => void
  density: "comfortable" | "compact"
  setDensity: (density: "comfortable" | "compact") => void
  scenarios: Scenario[]
  activeScenarioId: string | null
  setActiveScenarioId: (id: string | null) => void
  handleRunSimulation: () => Promise<void>
  handleRenameScenario: (scenarioId: string, name: string) => void
}

const NotebookContext = createContext<NotebookContextType | undefined>(undefined)

export function NotebookProvider({
  children,
  notebook: initialNotebook
}: {
  children: React.ReactNode
  notebook: Notebook
}) {
  const [notebook, setNotebook] = useState<Notebook>(initialNotebook)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable")
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  const handleRenameScenario = (scenarioId: string, name: string) => {
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === scenarioId ? { ...scenario, name: name || scenario.name } : scenario
      )
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
  }

  return (
    <NotebookContext.Provider
      value={{
        notebook,
        setNotebook,
        simulationResult,
        setSimulationResult,
        isSimulating,
        theme,
        setTheme,
        density,
        setDensity,
        scenarios,
        activeScenarioId,
        setActiveScenarioId,
        handleRunSimulation,
        handleRenameScenario,
      }}
    >
      {children}
    </NotebookContext.Provider>
  )
}

export function useNotebook() {
  const context = useContext(NotebookContext)
  if (!context) {
    throw new Error("useNotebook must be used within a NotebookProvider")
  }
  return context
}