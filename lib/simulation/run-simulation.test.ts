import { describe, expect, it } from "vitest"

import { mockNotebook } from "@/lib/mock-data"
import type { Notebook } from "@/lib/types/notebook"

import { runSimulation } from "./runSimulation"

const deterministicNotebook: Notebook = {
  ...mockNotebook,
  metrics: mockNotebook.metrics.map((metric) => {
    if (!metric.distribution) return metric
    const value = metric.distribution.mode ?? 0
    return {
      ...metric,
      distribution: {
        min: value,
        mode: value,
        max: value,
      },
    }
  }),
}

describe("runSimulation", () => {
  it("uses category output formulas and signs cost contributions", async () => {
    const result = await runSimulation(deterministicNotebook, 5)
    const timeSavings = result.categoryContributions.find((category) => category.categoryId === "cat-time-savings")
    const costs = result.categoryContributions.find((category) => category.categoryId === "cat-costs")

    expect(timeSavings?.contribution).toBeGreaterThan(0)
    expect(costs?.contribution).toBeLessThan(0)
  })

  it("uses explicit yearly net formulas for first-year one-time costs", async () => {
    const result = await runSimulation(deterministicNotebook, 5)

    expect(result.yearlyResults.at(0)?.costs.p50).toBeCloseTo(390_000)
    expect(result.yearlyResults.at(1)?.costs.p50).toBeCloseTo(365_000)
    expect(result.yearlyResults.at(2)?.costs.p50).toBeCloseTo(365_000)
  })

  it("returns real payback distribution stats", async () => {
    const result = await runSimulation(deterministicNotebook, 5)

    expect(result.paybackPeriod.p10).toBeLessThanOrEqual(result.paybackPeriod.p50)
    expect(result.paybackPeriod.p50).toBeLessThanOrEqual(result.paybackPeriod.p90)
    expect(result.paybackPeriod.mean).toBeGreaterThanOrEqual(0)
    expect(result.paybackPeriod.std).toBeGreaterThanOrEqual(0)
  })

  it("rejects invalid metric distributions", async () => {
    const invalidNotebook: Notebook = {
      ...deterministicNotebook,
      metrics: deterministicNotebook.metrics.map((metric, index) =>
        index === 0
          ? {
              ...metric,
              distribution: { min: 10, mode: 5, max: 1 },
              value: undefined,
            }
          : metric
      ),
    }

    await expect(runSimulation(invalidNotebook, 1)).rejects.toThrow("min <= mode <= max")
  })
})
