import type { EvaluationContext, FormulaNode } from "./types"

const aggregate = (
  values: (number | null | undefined)[],
  reducer: (acc: number, value: number) => number,
  initial = 0
): number =>
  values.reduce((acc, current) => {
    if (current === null || current === undefined || Number.isNaN(current)) {
      return acc
    }
    return reducer(acc!, current)
  }, initial) as number

export function evaluateFormula(node: FormulaNode, context: EvaluationContext): number {
  switch (node.type) {
    case "NumberLiteral":
      return node.value
    case "Reference": {
      const value = context.resolveReference(node.name)
      if (value === null || value === undefined) {
        return Number.NaN
      }
      return value
    }
    case "UnaryExpression": {
      const argument = evaluateFormula(node.argument, context)
      if (Number.isNaN(argument)) return Number.NaN
      return node.operator === "-" ? -argument : argument
    }
    case "BinaryExpression": {
      const left = evaluateFormula(node.left, context)
      const right = evaluateFormula(node.right, context)
      if (Number.isNaN(left) || Number.isNaN(right)) return Number.NaN
      switch (node.operator) {
        case "+":
          return left + right
        case "-":
          return left - right
        case "*":
          return left * right
        case "/":
          return right === 0 ? Number.NaN : left / right
        default:
          return Number.NaN
      }
    }
    case "CallExpression": {
      const args = node.arguments.map((argument) => evaluateFormula(argument, context))
      switch (node.callee.toLowerCase()) {
        case "min":
          return Math.min(...args.filter((value) => !Number.isNaN(value)))
        case "max":
          return Math.max(...args.filter((value) => !Number.isNaN(value)))
        case "sum":
          return aggregate(args, (acc, value) => acc + value, 0)
        case "ifnull": {
          const [value, fallback] = args
          if (value === null || value === undefined || Number.isNaN(value)) {
            return fallback ?? Number.NaN
          }
          return value
        }
        case "avg":
        case "average": {
          const valid = args.filter((value) => !Number.isNaN(value))
          if (!valid.length) return Number.NaN
          return valid.reduce((acc, value) => acc + value, 0) / valid.length
        }
        default:
          return Number.NaN
      }
    }
    default:
      return Number.NaN
  }
}
