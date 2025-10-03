import type { Metric } from "@/lib/types/notebook"
import { buildDependencyMap, detectCircularDependencies, topologicalSort } from "./dependency"
import { evaluateFormula } from "./evaluator"
import { parseFormula } from "./parser"
import type { FormulaNode } from "./types"

export interface FormulaCompilation {
  ast: FormulaNode
  raw: string
}

export interface FormulaRegistry {
  [metricId: string]: FormulaCompilation
}

export const compileMetricFormulas = (metrics: Metric[]): FormulaRegistry => {
  const registry: FormulaRegistry = {}
  metrics.forEach((metric) => {
    if (!metric.formula) return
    registry[metric.id] = {
      ast: parseFormula(metric.formula),
      raw: metric.formula,
    }
  })
  return registry
}

export const evaluateFormulas = (
  registry: FormulaRegistry,
  baseValues: Record<string, number>,
): Record<string, number> => {
  const dependencyMap = buildDependencyMap(
    Object.fromEntries(Object.entries(registry).map(([metricId, compiled]) => [metricId, compiled.ast])),
  )

  const cycles = detectCircularDependencies(dependencyMap)
  if (cycles.length) {
    throw new Error(`Circular formula dependency: ${cycles.join(", ")}`)
  }

  const order = topologicalSort(dependencyMap)
  const evaluated = { ...baseValues }

  order.forEach((metricId) => {
    const compiled = registry[metricId]
    if (!compiled) return
    const value = evaluateFormula(compiled.ast, {
      resolveReference: (name) => evaluated[name],
    })
    evaluated[metricId] = value
  })

  return evaluated
}
