import type { DependencyMap, FormulaNode } from "./types"

const collectReferences = (node: FormulaNode, set: Set<string>) => {
  switch (node.type) {
    case "Reference":
      set.add(node.name)
      break
    case "BinaryExpression":
      collectReferences(node.left, set)
      collectReferences(node.right, set)
      break
    case "UnaryExpression":
      collectReferences(node.argument, set)
      break
    case "CallExpression":
      node.arguments.forEach((argument) => collectReferences(argument, set))
      break
    default:
      break
  }
}

export const buildDependencyMap = (formulas: Record<string, FormulaNode>): DependencyMap => {
  const map: DependencyMap = {}
  Object.entries(formulas).forEach(([metricId, ast]) => {
    const dependencies = new Set<string>()
    collectReferences(ast, dependencies)
    map[metricId] = dependencies
  })
  return map
}

export const detectCircularDependencies = (dependencyMap: DependencyMap): string[] => {
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

export const topologicalSort = (dependencyMap: DependencyMap): string[] => {
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, Set<string>>()

  Object.entries(dependencyMap).forEach(([node, dependencies]) => {
    if (!inDegree.has(node)) inDegree.set(node, 0)
    dependencies.forEach((dependency) => {
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1)
      if (!dependents.has(dependency)) dependents.set(dependency, new Set())
      dependents.get(dependency)!.add(node)
      if (!inDegree.has(dependency)) inDegree.set(dependency, 0)
    })
  })

  const queue: string[] = []
  inDegree.forEach((degree, node) => {
    if (degree === 0) queue.push(node)
  })

  const order: string[] = []
  while (queue.length) {
    const node = queue.shift()!
    order.push(node)

    dependents.get(node)?.forEach((dependent) => {
      const nextDegree = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, nextDegree)
      if (nextDegree === 0) queue.push(dependent)
    })
  }

  return order
}
