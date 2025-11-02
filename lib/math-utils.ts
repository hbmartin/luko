import { all, create, FactoryFunctionMap, type MathNode } from "mathjs"

const math = create(all as FactoryFunctionMap)

export const detectDependencies = (expression: string): Set<string> | undefined => {
  const dependencies: Set<string> = new Set()

  let node: MathNode
  try {
    node = math.parse(expression)
  } catch {
    return undefined
  }
  node.traverse((child, _path, parent) => {
    if (!math.isSymbolNode(child)) return
    if (math.isFunctionNode(parent) && parent.fn === child) return
    dependencies.add(child.name)
  })

  return dependencies
}

export const parseNumeric = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return Number.NaN
    const sanitized = trimmed.replace(/,/g, "")
    const parsed = Number(sanitized)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  return Number.NaN
}
