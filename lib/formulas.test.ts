/* eslint-disable unicorn/no-null */

import { describe, expect, it } from "vitest"

import { compileNotebookFormulas, evaluateFormulas, evaluatePlan, planEvaluation } from "@/lib/formulas"
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

const createFocusedNotebook = (): Notebook => ({
  id: "formula-test-notebook",
  name: "Formula test notebook",
  categories: [],
  metrics: [
    {
      id: "salary",
      name: "Salary",
      unit: "$/year",
      distribution: null,
      value: 208_000,
      categoryId: "cat-facts",
    },
    {
      id: "hours_per_year",
      name: "Hours per year",
      unit: "hours/year",
      distribution: null,
      value: 2080,
      categoryId: "cat-facts",
    },
    {
      id: "derived_hourly_rate",
      name: "Derived hourly rate",
      unit: "$/hour",
      distribution: null,
      formula: "salary / hours_per_year",
      categoryId: "cat-facts",
    },
    {
      id: "hours_saved",
      name: "Hours saved",
      unit: "hours/year",
      distribution: null,
      value: 10,
      categoryId: "cat-facts",
    },
    {
      id: "quality_savings",
      name: "Quality savings",
      unit: "$",
      distribution: null,
      value: 250,
      categoryId: "cat-facts",
    },
    {
      id: "revenue_impact",
      name: "Revenue impact",
      unit: "$",
      distribution: null,
      value: 500,
      categoryId: "cat-facts",
    },
    {
      id: "retention_savings",
      name: "Retention savings",
      unit: "$",
      distribution: null,
      value: 125,
      categoryId: "cat-facts",
    },
    {
      id: "npv_multiplier",
      name: "NPV multiplier",
      unit: "dimensionless",
      distribution: null,
      value: 2,
      categoryId: "cat-facts",
    },
  ],
  formulas: [
    {
      id: "formula_time_savings_total",
      name: "Annual Time Savings",
      categoryId: "cat-facts",
      expression: "hours_saved * derived_hourly_rate",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "formula_quality_savings",
      name: "Annual Quality Savings",
      categoryId: "cat-facts",
      expression: "quality_savings",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "formula_product_revenue_impact",
      name: "Annual Revenue Impact",
      categoryId: "cat-facts",
      expression: "revenue_impact",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "formula_retention_savings",
      name: "Annual Retention Savings",
      categoryId: "cat-facts",
      expression: "retention_savings",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "formula_total_annual_benefits",
      name: "Total Annual Benefits",
      categoryId: "cat-facts",
      expression:
        "formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "formula_npv_3_year",
      name: "NPV (3 Years)",
      categoryId: "cat-facts",
      expression: "formula_total_annual_benefits * npv_multiplier",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  lastSimulationId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  isDirty: false,
  dirtyMetrics: [],
  dirtyFormulas: [],
})

describe("notebook formula evaluation", () => {
  it("evaluates formula rows alongside metric formulas", () => {
    const focusedNotebook = createFocusedNotebook()
    const registry = compileNotebookFormulas(focusedNotebook)
    const values = evaluateFormulas(registry, createBaseValues(focusedNotebook))

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

  it("reuses planned evaluation order without changing results", () => {
    const focusedNotebook = createFocusedNotebook()
    const registry = compileNotebookFormulas(focusedNotebook)
    const baseValues = createBaseValues(focusedNotebook)
    const expected = evaluateFormulas(registry, baseValues)
    const plan = planEvaluation(registry)
    const target: Record<string, number> = { stale_formula: 123 }
    const plannedValues = evaluatePlan(plan, baseValues, target)
    const { stale_formula: staleFormula, ...plannedFormulaValues } = plannedValues

    expect(plannedValues).toBe(target)
    expect(staleFormula).toBe(123)
    expect(plannedFormulaValues).toEqual(expected)
    expect(planEvaluation(registry)).toBe(plan)
  })

  it("filters dependency graph entries to allowed formula and metric keys", () => {
    const notebook: Notebook = {
      ...createFocusedNotebook(),
      metrics: [
        {
          id: "salary",
          name: "Salary",
          unit: "$/year",
          distribution: null,
          value: 208_000,
          categoryId: "cat-facts",
        },
      ],
      formulas: [
        {
          id: "formula_with_global",
          name: "Formula with global",
          categoryId: "cat-facts",
          expression: "salary + pi",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }
    const registry = compileNotebookFormulas(notebook)
    const plan = planEvaluation(registry, new Set([...Object.keys(registry), "salary"]))

    expect(plan.order).toContain("salary")
    expect(plan.order).toContain("formula_with_global")
    expect(plan.order).not.toContain("pi")
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
    expect(() => planEvaluation(registry)).toThrow("Circular formula dependency")
  })
})
