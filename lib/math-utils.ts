import { all, create, FactoryFunctionMap } from "mathjs"

const math = create(all as FactoryFunctionMap)

export const detectDependencies = (expression: string): Set<string> => {
  const dependencies: Set<string> = new Set()

  const node = math.parse(expression)
  node.traverse((child, _path, parent) => {
    if (!math.isSymbolNode(child)) return
    if (math.isFunctionNode(parent) && parent.fn === child) return
    dependencies.add(child.name)
  })

  return dependencies
}
