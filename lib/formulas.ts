import { all, create, EvalFunction, FactoryFunctionMap, MathNode, MathType } from "mathjs"
import type { Formula, Metric, Notebook } from "@/lib/types/notebook"

const math = create(all as FactoryFunctionMap)

export interface FormulaCompilation {
  raw: string
  node: MathNode
  compiled: EvalFunction
  dependencies: string[]
}

export type FormulaRegistry = Record<string, FormulaCompilation>

export interface FormulaEvaluationPlan {
  order: string[]
  registry: FormulaRegistry
}

type DependencyMap = Record<string, Set<string>>

const MAX_NOTEBOOK_FORMULA_REGISTRY_CACHE_SIZE = 64
const notebookFormulaRegistryCache = new Map<string, FormulaRegistry>()
const evaluationPlanCache = new WeakMap<FormulaRegistry, Map<string, FormulaEvaluationPlan>>()

const extractDependencies = (node: MathNode): string[] => {
  const dependencies = new Set<string>()
  node.traverse((child, _path, parent) => {
    if (!math.isSymbolNode(child)) return
    if (math.isFunctionNode(parent) && parent.fn === child) return
    dependencies.add(child.name)
  })
  return [...dependencies]
}

const getAllowedKeysSignature = (allowedKeys: ReadonlySet<string>) => [...allowedKeys].toSorted().join("\u0000")

const getNotebookFormulaSignature = (notebook: Pick<Notebook, "metrics" | "formulas">): string =>
  JSON.stringify([
    notebook.metrics.map((metric) => [metric.id, metric.formula?.trim() ?? ""]),
    notebook.formulas.map((formula) => [formula.id, formula.expression.trim()]),
  ])

const rememberNotebookFormulaRegistry = (signature: string, registry: FormulaRegistry) => {
  if (notebookFormulaRegistryCache.size >= MAX_NOTEBOOK_FORMULA_REGISTRY_CACHE_SIZE) {
    const oldestKey = notebookFormulaRegistryCache.keys().next().value
    if (oldestKey !== undefined) {
      notebookFormulaRegistryCache.delete(oldestKey)
    }
  }

  notebookFormulaRegistryCache.set(signature, registry)
  return registry
}

const buildDependencyMap = (registry: FormulaRegistry, allowedKeys: ReadonlySet<string>): DependencyMap => {
  const map: DependencyMap = {}
  for (const [metricId, { dependencies }] of Object.entries(registry)) {
    map[metricId] = new Set(dependencies.filter((dependency) => allowedKeys.has(dependency)))
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

    const dependencies = dependencyMap[node]
    if (dependencies) {
      for (const dependency of dependencies) {
        visit(dependency)
      }
    }

    stack.delete(node)
  }

  for (const node of Object.keys(dependencyMap)) {
    visit(node)
  }

  return cycles
}

const topologicalSort = (dependencyMap: DependencyMap): string[] => {
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, Set<string>>()

  for (const [node, dependencies] of Object.entries(dependencyMap)) {
    if (!inDegree.has(node)) inDegree.set(node, 0)
    for (const dependency of dependencies) {
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1)
      let dependencyDependents = dependents.get(dependency)
      if (!dependencyDependents) {
        dependencyDependents = new Set()
        dependents.set(dependency, dependencyDependents)
      }
      dependencyDependents.add(node)
      if (!inDegree.has(dependency)) inDegree.set(dependency, 0)
    }
  }

  const queue: string[] = []
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(node)
  }

  const order: string[] = []
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]
    if (node === undefined) continue
    order.push(node)

    const nodeDependents = dependents.get(node)
    if (!nodeDependents) continue
    for (const dependent of nodeDependents) {
      const nextDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, nextDegree)
      if (nextDegree === 0) queue.push(dependent)
    }
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

export const compileFormulaRows = (formulas: Formula[]): FormulaRegistry => {
  const registry: FormulaRegistry = {}

  for (const formula of formulas) {
    const rawFormula = formula.expression.trim()
    if (!rawFormula) continue
    const node = parseFormula(rawFormula)
    registry[formula.id] = {
      raw: rawFormula,
      node,
      compiled: node.compile(),
      dependencies: extractDependencies(node),
    }
  }

  return registry
}

export const compileNotebookFormulas = (notebook: Notebook): FormulaRegistry => {
  const signature = getNotebookFormulaSignature(notebook)
  const cachedRegistry = notebookFormulaRegistryCache.get(signature)
  if (cachedRegistry) {
    notebookFormulaRegistryCache.delete(signature)
    notebookFormulaRegistryCache.set(signature, cachedRegistry)
    return cachedRegistry
  }

  return rememberNotebookFormulaRegistry(signature, {
    ...compileMetricFormulas(notebook.metrics),
    ...compileFormulaRows(notebook.formulas),
  })
}

export const planEvaluation = (
  registry: FormulaRegistry,
  allowedKeys: ReadonlySet<string> = new Set(Object.keys(registry))
): FormulaEvaluationPlan => {
  const cacheKey = getAllowedKeysSignature(allowedKeys)
  const registryCache = evaluationPlanCache.get(registry)
  const cachedPlan = registryCache?.get(cacheKey)
  if (cachedPlan) return cachedPlan

  const dependencyMap = buildDependencyMap(registry, allowedKeys)

  const cycles = detectCircularDependencies(dependencyMap)
  if (cycles.length > 0) {
    throw new Error(`Circular formula dependency: ${cycles.join(", ")}`)
  }

  const order = topologicalSort(dependencyMap)
  const plan = { order, registry }
  if (registryCache) {
    registryCache.set(cacheKey, plan)
  } else {
    evaluationPlanCache.set(registry, new Map([[cacheKey, plan]]))
  }
  return plan
}

export const evaluatePlan = (
  plan: FormulaEvaluationPlan,
  baseValues: Record<string, number>,
  target: Record<string, number> = {}
): Record<string, number> => {
  for (const key of Object.keys(baseValues)) {
    const value = baseValues[key]
    if (value !== undefined) {
      target[key] = value
    }
  }

  for (const metricId of plan.order) {
    const compilation = plan.registry[metricId]
    if (!compilation) continue
    const value = compilation.compiled.evaluate(target) as unknown as MathType
    target[metricId] = toNumber(value)
  }

  return target
}

export const evaluateFormulas = (
  registry: FormulaRegistry,
  baseValues: Record<string, number>
): Record<string, number> => evaluatePlan(planEvaluation(registry), baseValues)
