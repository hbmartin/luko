/* eslint-disable unicorn/no-null */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { mockSimulationResult } from "@/lib/mock-data"
import type { SimulationResult } from "@/lib/types/notebook"

import { ResultsTab } from "./ResultsTab"

const noActiveScenarioId: string | null = null
const noSimulationError: string | null = null
const noSimulationResult: SimulationResult | null = null
const context = vi.hoisted(() => ({
  handleRunSimulation: vi.fn(() => Promise.resolve()),
  isSimulating: false,
  simulationError: null as string | null,
}))

const noScenarios = []
const scenarios = [
  {
    id: "base",
    name: "Base",
    result: mockSimulationResult,
    createdAt: mockSimulationResult.metadata.timestamp,
  },
  {
    id: "upside",
    name: "Upside",
    result: {
      ...mockSimulationResult,
      npv: {
        ...mockSimulationResult.npv,
        p50: mockSimulationResult.npv.p50 + 100_000,
      },
    },
    createdAt: mockSimulationResult.metadata.timestamp,
  },
]

vi.mock("../NotebookProvider", () => ({
  useNotebook: () => context,
}))

describe("ResultsTab", () => {
  beforeEach(() => {
    context.handleRunSimulation.mockClear()
    context.isSimulating = false
    context.simulationError = noSimulationError
  })

  it("waits for an explicit simulation run", () => {
    render(
      <ResultsTab
        simulationResult={noSimulationResult}
        scenarios={noScenarios}
        activeScenarioId={noActiveScenarioId}
        onSelectScenario={vi.fn()}
        onRenameScenario={vi.fn()}
      />
    )

    expect(context.handleRunSimulation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Run Simulation" }))

    expect(context.handleRunSimulation).toHaveBeenCalledTimes(1)
  })

  it("supports valid scenario rename and compare interactions", () => {
    const onSelectScenario = vi.fn()
    const onRenameScenario = vi.fn()

    render(
      <ResultsTab
        simulationResult={mockSimulationResult}
        scenarios={scenarios}
        activeScenarioId="base"
        onSelectScenario={onSelectScenario}
        onRenameScenario={onRenameScenario}
      />
    )

    fireEvent.doubleClick(screen.getByRole("button", { name: "Base" }))
    const input = screen.getByLabelText("Scenario name")
    fireEvent.change(input, { target: { value: "Renamed Base" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onRenameScenario).toHaveBeenCalledWith("base", "Renamed Base")

    const upsideCompare = screen.getAllByLabelText("Compare").at(1)
    if (!upsideCompare) {
      throw new Error("Expected an upside scenario comparison checkbox")
    }

    fireEvent.click(upsideCompare)

    expect(upsideCompare).toBeChecked()
  })

  it("shows rerun errors while populated results remain visible", () => {
    context.simulationError = "Simulation failed"

    render(
      <ResultsTab
        simulationResult={mockSimulationResult}
        scenarios={scenarios}
        activeScenarioId="base"
        onSelectScenario={vi.fn()}
        onRenameScenario={vi.fn()}
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Simulation failed")
    expect(screen.getByText("Median NPV (3-Year)")).toBeInTheDocument()
  })
})
