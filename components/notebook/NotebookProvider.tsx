"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Notebook, SimulationResult, SimulationResultSchema } from "@/lib/types/notebook"
import { applyNotebookValidations } from "@/lib/utils/notebook-validation"

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
  simulationError: string | null
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
  notebook: initialNotebook,
}: {
  children: React.ReactNode
  notebook: Notebook
}) {
  const [notebook, setNotebookState] = useState<Notebook>(() => applyNotebookValidations(initialNotebook))
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable")
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  const setNotebook = useCallback((nextNotebook: Notebook) => {
    setNotebookState(applyNotebookValidations(nextNotebook))
  }, [])

  const handleRenameScenario = useCallback((scenarioId: string, name: string) => {
    setScenarios((previous) =>
      previous.map((scenario) => (scenario.id === scenarioId ? { ...scenario, name: name || scenario.name } : scenario))
    )
  }, [])

  useEffect(() => {
    document.title = `Luko - ${notebook.name}`
  }, [notebook.name])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applySystemTheme = (event: MediaQueryList | MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light")
    }

    applySystemTheme(mediaQuery)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applySystemTheme)
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(applySystemTheme)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", applySystemTheme)
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(applySystemTheme)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.density = density
  }, [theme, density])

  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true)
    setSimulationError(null)

    try {
      const response = await fetch(`/api/notebooks/${encodeURIComponent(notebook.id)}/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notebook }),
      })

      const body: unknown = await response.json()
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "Simulation failed"
        throw new Error(message)
      }

      const augmentedResult = SimulationResultSchema.parse(body)

      setSimulationResult(augmentedResult)
      const scenarioId = `scenario-${Date.now()}`
      setScenarios((previous) => {
        const scenario: Scenario = {
          id: scenarioId,
          name: `Scenario ${previous.length + 1}`,
          result: augmentedResult,
          createdAt: augmentedResult.metadata.timestamp,
        }
        setActiveScenarioId(scenarioId)
        return [...previous, scenario]
      })
      setNotebookState((previous) =>
        applyNotebookValidations({
          ...previous,
          isDirty: false,
          dirtyMetrics: [],
          dirtyFormulas: [],
          lastSimulationId: scenarioId,
        })
      )
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : "Simulation failed")
    } finally {
      setIsSimulating(false)
    }
  }, [notebook])

  const contextValue = useMemo<NotebookContextType>(
    () => ({
      notebook,
      setNotebook,
      simulationResult,
      setSimulationResult,
      isSimulating,
      simulationError,
      theme,
      setTheme,
      density,
      setDensity,
      scenarios,
      activeScenarioId,
      setActiveScenarioId,
      handleRunSimulation,
      handleRenameScenario,
    }),
    [
      activeScenarioId,
      density,
      handleRenameScenario,
      handleRunSimulation,
      isSimulating,
      notebook,
      scenarios,
      setNotebook,
      simulationError,
      simulationResult,
      theme,
    ]
  )

  return <NotebookContext.Provider value={contextValue}>{children}</NotebookContext.Provider>
}

export function useNotebook() {
  const context = useContext(NotebookContext)
  if (!context) {
    throw new Error("useNotebook must be used within a NotebookProvider")
  }
  return context
}
