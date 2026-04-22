import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useCallback } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mockNotebook, mockSimulationResult } from "@/lib/mock-data"

import { NotebookProvider, useNotebookActions, useNotebookSelector } from "./NotebookProvider"

describe("NotebookProvider selector store", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("re-renders only consumers whose selected value changes", async () => {
    let actionRenders = 0
    let metricCountRenders = 0
    let nameRenders = 0

    function ActionProbe() {
      actionRenders += 1
      const { setNotebook } = useNotebookActions()
      const handleRename = useCallback(() => {
        setNotebook((current) => ({ ...current, name: `${current.name} updated` }))
      }, [setNotebook])

      return (
        <button type="button" onClick={handleRename}>
          Rename notebook
        </button>
      )
    }

    function MetricCountProbe() {
      metricCountRenders += 1
      const metricCount = useNotebookSelector((state) => state.notebook.metrics.length)
      return <output aria-label="metric count">{metricCount}</output>
    }

    function NameProbe() {
      nameRenders += 1
      const name = useNotebookSelector((state) => state.notebook.name)
      return <output aria-label="notebook name">{name}</output>
    }

    render(
      <NotebookProvider notebook={mockNotebook}>
        <ActionProbe />
        <MetricCountProbe />
        <NameProbe />
      </NotebookProvider>
    )

    expect(actionRenders).toBe(1)
    expect(metricCountRenders).toBe(1)
    expect(nameRenders).toBe(1)

    fireEvent.click(screen.getByRole("button", { name: "Rename notebook" }))

    await waitFor(() => {
      expect(screen.getByLabelText("notebook name")).toHaveTextContent(`${mockNotebook.name} updated`)
    })

    expect(actionRenders).toBe(1)
    expect(metricCountRenders).toBe(1)
    expect(nameRenders).toBe(2)
  })

  it("clears dirty state when the completed simulation still matches the current notebook", async () => {
    const metric = mockNotebook.metrics[0]
    if (!metric) throw new Error("Expected a metric fixture")
    const metricId = metric.id

    vi.spyOn(Date, "now").mockReturnValue(12_345)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(mockSimulationResult)))
    )

    function ActionProbe() {
      const { handleRunSimulation } = useNotebookActions()
      const handleRun = useCallback(() => {
        void handleRunSimulation()
      }, [handleRunSimulation])

      return (
        <button type="button" onClick={handleRun}>
          Run simulation
        </button>
      )
    }

    function DirtyStateProbe() {
      const isDirty = useNotebookSelector((state) => state.notebook.isDirty)
      const dirtyMetricCount = useNotebookSelector((state) => state.notebook.dirtyMetrics.length)
      const lastSimulationId = useNotebookSelector((state) => state.notebook.lastSimulationId ?? "none")

      return (
        <>
          <output aria-label="is dirty">{String(isDirty)}</output>
          <output aria-label="dirty metric count">{dirtyMetricCount}</output>
          <output aria-label="last simulation id">{lastSimulationId}</output>
        </>
      )
    }

    const dirtyNotebook = {
      ...mockNotebook,
      isDirty: true,
      dirtyMetrics: [metricId],
    }

    render(
      <NotebookProvider notebook={dirtyNotebook}>
        <ActionProbe />
        <DirtyStateProbe />
      </NotebookProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }))

    await waitFor(() => {
      expect(screen.getByLabelText("last simulation id")).toHaveTextContent("scenario-12345")
    })

    expect(screen.getByLabelText("is dirty")).toHaveTextContent("false")
    expect(screen.getByLabelText("dirty metric count")).toHaveTextContent("0")
  })

  it("preserves local dirty state when the notebook changes while simulation is in flight", async () => {
    const metric = mockNotebook.metrics[0]
    if (!metric) throw new Error("Expected a metric fixture")
    const metricId = metric.id

    let simulationResponse: Response | undefined
    const waitForSimulationResponse = async () => {
      while (!simulationResponse) {
        await new Promise((resolve) => {
          globalThis.setTimeout(resolve, 0)
        })
      }
      return simulationResponse
    }
    vi.spyOn(Date, "now").mockReturnValue(67_890)
    const fetchMock = vi.fn(waitForSimulationResponse)
    vi.stubGlobal("fetch", fetchMock)

    function ActionProbe() {
      const { handleRunSimulation, setNotebook } = useNotebookActions()
      const handleRun = useCallback(() => {
        void handleRunSimulation()
      }, [handleRunSimulation])
      const handleEdit = useCallback(() => {
        setNotebook((current) => ({
          ...current,
          name: `${current.name} local edit`,
          dirtyMetrics: [...new Set([...current.dirtyMetrics, metricId])],
          isDirty: true,
        }))
      }, [metricId, setNotebook])

      return (
        <>
          <button type="button" onClick={handleRun}>
            Run simulation
          </button>
          <button type="button" onClick={handleEdit}>
            Edit notebook
          </button>
        </>
      )
    }

    function DirtyStateProbe() {
      const isDirty = useNotebookSelector((state) => state.notebook.isDirty)
      const dirtyMetrics = useNotebookSelector((state) => state.notebook.dirtyMetrics.join(","))
      const lastSimulationId = useNotebookSelector((state) => state.notebook.lastSimulationId ?? "none")
      const scenarioCount = useNotebookSelector((state) => state.scenarios.length)

      return (
        <>
          <output aria-label="is dirty">{String(isDirty)}</output>
          <output aria-label="dirty metrics">{dirtyMetrics}</output>
          <output aria-label="last simulation id">{lastSimulationId}</output>
          <output aria-label="scenario count">{scenarioCount}</output>
        </>
      )
    }

    render(
      <NotebookProvider notebook={mockNotebook}>
        <ActionProbe />
        <DirtyStateProbe />
      </NotebookProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole("button", { name: "Edit notebook" }))
    await waitFor(() => {
      expect(screen.getByLabelText("is dirty")).toHaveTextContent("true")
    })

    act(() => {
      simulationResponse = Response.json(mockSimulationResult)
    })

    await waitFor(() => {
      expect(screen.getByLabelText("scenario count")).toHaveTextContent("1")
    })

    expect(screen.getByLabelText("is dirty")).toHaveTextContent("true")
    expect(screen.getByLabelText("dirty metrics")).toHaveTextContent(metricId)
    expect(screen.getByLabelText("last simulation id")).toHaveTextContent("none")
  })
})
