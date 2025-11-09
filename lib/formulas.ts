import { all, create, EvalFunction, FactoryFunctionMap, MathNode, MathType } from "mathjs"
import type { Metric } from "@/lib/types/notebook"

const math = create(all as FactoryFunctionMap)

export interface FormulaCompilation {
  raw: string
  node: MathNode
  compiled: EvalFunction
  dependencies: string[]
}

export type FormulaRegistry = Record<string, FormulaCompilation>

type DependencyMap = Record<string, Set<string>>

const extractDependencies = (node: MathNode): string[] => {
  const dependencies = new Set<string>()
  node.traverse((child, _path, parent) => {
    if (!math.isSymbolNode(child)) return
    if (math.isFunctionNode(parent) && parent.fn === child) return
    dependencies.add(child.name)
  })
  return [...dependencies]
}

// Currently all symbol names (e.g., pi) enter the graph, inflating sort order.
// Consider filtering to keys present in the registry to avoid noise and speed up evaluation.

const buildDependencyMap = (registry: FormulaRegistry): DependencyMap => {
  const map: DependencyMap = {}
  for (const [metricId, { dependencies }] of Object.entries(registry)) {
    map[metricId] = new Set(dependencies)
  }
  return map
}

const detectCircularDependencies = (dependencyMap: DependencyMap): string[] => {
  const visited = new Set<string>()
  const stack = new Set<string>()
  const cycles: string[] = []

  const visit = (node: string) => {
    if (stack.has(node)) {
      cycles.push(node)
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    stack.add(node)

    dependencyMap[node]?.forEach(visit)

    stack.delete(node)
  }

  Object.keys(dependencyMap).forEach(visit)

  return cycles
}

const topologicalSort = (dependencyMap: DependencyMap): string[] => {
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, Set<string>>()

  for (const [node, dependencies] of Object.entries(dependencyMap)) {
    if (!inDegree.has(node)) inDegree.set(node, 0)
    for (const dependency of dependencies) {
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1)
      if (!dependents.has(dependency)) dependents.set(dependency, new Set())
      dependents.get(dependency)!.add(node)
      if (!inDegree.has(dependency)) inDegree.set(dependency, 0)
    }
  }

  const queue: string[] = []
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(node)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) continue
    order.push(node)

    dependents.get(node)?.forEach((dependent) => {
      const nextDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, nextDegree)
      if (nextDegree === 0) queue.push(dependent)
    })
  }

  return order
}

const toNumber = (value: MathType): number => {
  if (typeof value === "number") return value
  if (typeof value === "boolean") {
    throw new TypeError("Formula must evaluate to a numeric value, not boolean.")
  }
  if (typeof value === "bigint") return Number(value)
  if (math.isBigNumber(value) || math.isFraction(value)) {
    return math.number(value)
  }
  if (math.isComplex(value)) {
    if (value.im !== 0) {
      throw new Error("Formula must evaluate to a real number.")
    }
    return value.re
  }
  if (math.isUnit(value) || math.isMatrix(value) || Array.isArray(value)) {
    throw new Error("Formula must evaluate to a scalar numeric value.")
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric
  }
  throw new Error("Formula must evaluate to a numeric value.")
}

export const parseFormula = (expression: string): MathNode => {
  try {
    return math.parse(expression)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw error
  }
}

export const compileMetricFormulas = (metrics: Metric[]): FormulaRegistry => {
  const registry: FormulaRegistry = {}

  for (const metric of metrics) {
    const rawFormula = metric.formula?.trim()
    if (!rawFormula) continue
    const node = parseFormula(rawFormula)
    registry[metric.id] = {
      raw: rawFormula,
      node,
      compiled: node.compile(),
      dependencies: extractDependencies(node),
    }
  }

  return registry
}

export const evaluateFormulas = (
  registry: FormulaRegistry,
  baseValues: Record<string, number>
): Record<string, number> => {
  const dependencyMap = buildDependencyMap(registry)

  const cycles = detectCircularDependencies(dependencyMap)
  if (cycles.length > 0) {
    throw new Error(`Circular formula dependency: ${cycles.join(", ")}`)
  }

  const order = topologicalSort(dependencyMap)
  const evaluated = { ...baseValues }

  for (const metricId of order) {
    const compilation = registry[metricId]
    if (!compilation) continue
    const value = compilation.compiled.evaluate(evaluated)
    evaluated[metricId] = toNumber(value)
  }

  return evaluated
}
