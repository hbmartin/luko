import { describe, expect, it } from "vitest"

import { compileNotebookFormulas, evaluateFormulas } from "@/lib/formulas"
import { mockNotebook } from "@/lib/mock-data"
import type { Notebook } from "@/lib/types/notebook"

const createBaseValues = (notebook: Notebook) =>
  Object.fromEntries(
    notebook.metrics.map((metric) => [metric.id, metric.value ?? metric.distribution?.mode ?? 0])
  ) as Record<string, number>

const getValue = (values: Record<string, number>, key: string) => {
  const value = values[key]
  if (value === undefined) {
    throw new Error(`Missing value for ${key}`)
  }
  return value
}

describe("notebook formula evaluation", () => {
  it("evaluates formula rows alongside metric formulas", () => {
    const registry = compileNotebookFormulas(mockNotebook)
    const values = evaluateFormulas(registry, createBaseValues(mockNotebook))

    expect(getValue(values, "formula_time_savings_total")).toBeGreaterThan(0)
    expect(getValue(values, "formula_total_annual_benefits")).toBeCloseTo(
      getValue(values, "formula_time_savings_total") +
        getValue(values, "formula_quality_savings") +
        getValue(values, "formula_product_revenue_impact") +
        getValue(values, "formula_retention_savings"),
      6
    )
    expect(getValue(values, "formula_npv_3_year")).toBeGreaterThan(0)
  })

  it("rejects circular dependencies across formula rows", () => {
    const notebook: Notebook = {
      ...mockNotebook,
      formulas: [
        {
          id: "formula_a",
          name: "Formula A",
          categoryId: "cat-facts",
          expression: "formula_b + 1",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "formula_b",
          name: "Formula B",
          categoryId: "cat-facts",
          expression: "formula_a + 1",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }

    const registry = compileNotebookFormulas(notebook)

    expect(() => evaluateFormulas(registry, createBaseValues(notebook))).toThrow("Circular formula dependency")
  })
})
