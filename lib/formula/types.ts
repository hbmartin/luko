export type FormulaNode =
  | NumberLiteralNode
  | ReferenceNode
  | BinaryExpressionNode
  | CallExpressionNode
  | UnaryExpressionNode

export interface NumberLiteralNode {
  type: "NumberLiteral"
  value: number
}

export interface ReferenceNode {
  type: "Reference"
  name: string
}

export interface UnaryExpressionNode {
  type: "UnaryExpression"
  operator: "+" | "-"
  argument: FormulaNode
}

export interface BinaryExpressionNode {
  type: "BinaryExpression"
  operator: "+" | "-" | "*" | "/"
  left: FormulaNode
  right: FormulaNode
}

export interface CallExpressionNode {
  type: "CallExpression"
  callee: string
  arguments: FormulaNode[]
}

export interface ParseError {
  message: string
  index: number
}

export type TokenType = "number" | "identifier" | "operator" | "leftParen" | "rightParen" | "comma"

export interface Token {
  type: TokenType
  value: string
  index: number
}

export interface EvaluationContext {
  resolveReference: (name: string) => number | null | undefined
}

export interface DependencyMap {
  [metricId: string]: Set<string>
}
