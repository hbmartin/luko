import type { ConstantNode, MathNode, OperatorNode, ParenthesisNode, SymbolNode } from "mathjs"
import { parseFormula } from "@/lib/formulas"

const operatorTokens = new Set(["+", "-", "*", "/", "^"])
const parenthesisTokens = new Set(["(", ")"])
const numericPattern = /^-?\d+(?:\.\d+)?$/

export type ExpressionToken =
  | { type: "metric"; metricId: string }
  | { type: "operator"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "number"; value: string }

export function tokensToExpression(tokens: ExpressionToken[]): string {
  const segments = tokens.map((token) => {
    if (token.type === "metric") return token.metricId
    if (token.type === "operator") return ` ${token.value} `
    if (token.type === "paren") return token.value
    if (token.type === "number") return token.value
    return ""
  })

  return segments.join("").replace(/\s+/g, " ").trim()
}

export function expressionToTokens(expression: string): ExpressionToken[] {
  const trimmed = expression.trim()
  if (!trimmed) return []

  try {
    const node = parseFormula(trimmed)
    return normalizeOperators(flattenNode(node))
  } catch {
    return fallbackTokens(trimmed)
  }
}

function flattenNode(node: MathNode): ExpressionToken[] {
  switch (node.type) {
    case "ParenthesisNode": {
      const parenthesisNode = node as ParenthesisNode
      return [{ type: "paren", value: "(" }, ...flattenNode(parenthesisNode.content), { type: "paren", value: ")" }]
    }
    case "OperatorNode": {
      const operatorNode = node as OperatorNode
      if (operatorNode.args.length === 1) {
        return [{ type: "operator", value: operatorNode.op ?? "-" }, ...flattenNode(operatorNode.args[0]!)]
      }
      const segments: ExpressionToken[] = []
      operatorNode.args.forEach((arg, index) => {
        if (index > 0) {
          segments.push({ type: "operator", value: operatorNode.op ?? "+" })
        }
        segments.push(...flattenNode(arg))
      })
      return segments
    }
    case "SymbolNode": {
      const symbolNode = node as SymbolNode
      return [{ type: "metric", metricId: symbolNode.name }]
    }
    case "ConstantNode": {
      const constantNode = node as ConstantNode
      return [{ type: "number", value: String(constantNode.value) }]
    }
    default:
      return [{ type: "number", value: node.toString() }]
  }
}

function normalizeOperators(tokens: ExpressionToken[]): ExpressionToken[] {
  return tokens.map((token) => {
    if (token.type === "operator" && token.value === "") {
      return { ...token, value: "+" }
    }
    return token
  })
}

function fallbackTokens(expression: string): ExpressionToken[] {
  const segments = expression.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/)

  const tokens: ExpressionToken[] = []
  segments.forEach((segment) => {
    if (!segment) return
    if (operatorTokens.has(segment)) {
      tokens.push({ type: "operator", value: segment })
      return
    }
    if (parenthesisTokens.has(segment)) {
      tokens.push({ type: "paren", value: segment as "(" | ")" })
      return
    }
    if (numericPattern.test(segment)) {
      tokens.push({ type: "number", value: segment })
      return
    }
    tokens.push({ type: "metric", metricId: segment })
  })
  return tokens
}
