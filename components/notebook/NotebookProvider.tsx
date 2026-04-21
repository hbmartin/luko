"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { Notebook, SimulationResult, SimulationResultSchema } from "@/lib/types/notebook"
import { applyNotebookValidations } from "@/lib/utils/notebook-validation"

export interface Scenario {
  id: string
  name: string
  result: SimulationResult
  createdAt: string
}

type Theme = "light" | "dark"
type Density = "comfortable" | "compact"
type NotebookUpdate = Notebook | ((notebook: Notebook) => Notebook)

export interface NotebookState {
  notebook: Notebook
  simulationResult: SimulationResult | null
  isSimulating: boolean
  simulationError: string | null
  theme: Theme
  density: Density
  scenarios: Scenario[]
  activeScenarioId: string | null
}

export interface NotebookActions {
  setNotebook(this: void, notebook: NotebookUpdate): void
  setSimulationResult(this: void, result: SimulationResult | null): void
  setTheme(this: void, theme: Theme): void
  setDensity(this: void, density: Density): void
  setActiveScenarioId(this: void, id: string | null): void
  handleRunSimulation(this: void): Promise<void>
  handleRenameScenario(this: void, scenarioId: string, name: string): void
}

interface NotebookStore {
  actions: NotebookActions
  getSnapshot(): NotebookState
  subscribe(listener: () => void): () => void
}

const NotebookContext = createContext<NotebookStore | undefined>(undefined)

const parseSimulationResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type")
  if (!contentType?.includes("application/json")) {
    return undefined
  }

  try {
    return await response.json()
  } catch (error) {
    if (response.ok) {
      throw error
    }
    return undefined
  }
}

const getSimulationErrorMessage = (body: unknown) => {
  if (typeof body !== "object" || !body || !("error" in body)) {
    return "Simulation failed"
  }

  const { error } = body as { error?: unknown }
  return typeof error === "string" ? error : "Simulation failed"
}

export function NotebookProvider({
  children,
  notebook: initialNotebook,
}: {
  children: React.ReactNode
  notebook: Notebook
}) {
  const [notebook, setNotebookState] = useState<Notebook>(() => applyNotebookValidations(initialNotebook))
  const [simulationResult, setSimulationResultState] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>("light")
  const [density, setDensity] = useState<Density>("comfortable")
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const isSimulatingReference = useRef(false)
  const listenersReference = useRef(new Set<() => void>())

  const stateSnapshot = useMemo<NotebookState>(
    () => ({
      notebook,
      simulationResult,
      isSimulating,
      simulationError,
      theme,
      density,
      scenarios,
      activeScenarioId,
    }),
    [activeScenarioId, density, isSimulating, notebook, scenarios, simulationError, simulationResult, theme]
  )
  const stateReference = useRef(stateSnapshot)
  stateReference.current = stateSnapshot

  useLayoutEffect(() => {
    for (const listener of listenersReference.current) {
      listener()
    }
  }, [stateSnapshot])

  const getSnapshot = useCallback(() => stateReference.current, [])

  const subscribe = useCallback((listener: () => void) => {
    listenersReference.current.add(listener)
    return () => {
      listenersReference.current.delete(listener)
    }
  }, [])

  const setNotebook = useCallback((nextNotebook: NotebookUpdate) => {
    setNotebookState((previous) => {
      const resolvedNotebook = typeof nextNotebook === "function" ? nextNotebook(previous) : nextNotebook
      return applyNotebookValidations(resolvedNotebook)
    })
  }, [])

  const setSimulationResult = useCallback((result: SimulationResult | null) => {
    setSimulationResultState(result)
  }, [])

  const handleRenameScenario = useCallback((scenarioId: string, name: string) => {
    setScenarios((previous) =>
      previous.map((scenario) => (scenario.id === scenarioId ? { ...scenario, name: name || scenario.name } : scenario))
    )
  }, [])

  const applySystemTheme = useEffectEvent((event: MediaQueryList | MediaQueryListEvent) => {
    setTheme(event.matches ? "dark" : "light")
  })

  useEffect(() => {
    document.title = `Luko - ${notebook.name}`
  }, [notebook.name])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

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
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.dataset.density = density
  }, [density])

  const handleRunSimulation = useCallback(async () => {
    if (isSimulatingReference.current) {
      return
    }

    isSimulatingReference.current = true
    setIsSimulating(true)
    setSimulationError(null)

    try {
      const currentNotebook = stateReference.current.notebook
      const simulatedUpdatedAt = currentNotebook.updatedAt
      const response = await globalThis.fetch(`/api/notebooks/${encodeURIComponent(currentNotebook.id)}/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notebook: currentNotebook }),
      })

      const body = await parseSimulationResponseBody(response)
      if (!response.ok) {
        throw new Error(getSimulationErrorMessage(body))
      }

      const augmentedResult = SimulationResultSchema.parse(body)
      const scenarioId = `scenario-${Date.now()}`

      setSimulationResultState(augmentedResult)
      setActiveScenarioId(scenarioId)
      setScenarios((previous) => {
        const scenario: Scenario = {
          id: scenarioId,
          name: `Scenario ${previous.length + 1}`,
          result: augmentedResult,
          createdAt: augmentedResult.metadata.timestamp,
        }
        return [...previous, scenario]
      })
      setNotebookState((previous) => {
        if (previous.id !== currentNotebook.id) return previous

        return applyNotebookValidations(
          previous.updatedAt === simulatedUpdatedAt
            ? {
                ...previous,
                isDirty: false,
                dirtyMetrics: [],
                dirtyFormulas: [],
                lastSimulationId: scenarioId,
              }
            : {
                ...previous,
                lastSimulationId: scenarioId,
              }
        )
      })
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : "Simulation failed")
    } finally {
      isSimulatingReference.current = false
      setIsSimulating(false)
    }
  }, [])

  const actions = useMemo<NotebookActions>(
    () => ({
      setNotebook,
      setSimulationResult,
      setTheme,
      setDensity,
      setActiveScenarioId,
      handleRunSimulation,
      handleRenameScenario,
    }),
    [handleRenameScenario, handleRunSimulation, setNotebook, setSimulationResult]
  )

  const store = useMemo<NotebookStore>(
    () => ({
      actions,
      getSnapshot,
      subscribe,
    }),
    [actions, getSnapshot, subscribe]
  )

  return <NotebookContext.Provider value={store}>{children}</NotebookContext.Provider>
}

const useNotebookStore = () => {
  const context = useContext(NotebookContext)
  if (!context) {
    throw new Error("useNotebook must be used within a NotebookProvider")
  }
  return context
}

export function useNotebookSelector<T>(selector: (state: NotebookState) => T): T {
  const store = useNotebookStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot())
  )
}

export function useNotebookActions() {
  return useNotebookStore().actions
}
