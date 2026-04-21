import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useCallback } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { mockNotebook } from "@/lib/mock-data"

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
})
