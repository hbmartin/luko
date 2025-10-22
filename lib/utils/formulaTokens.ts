import type { FormulaToken } from "@/lib/types/notebook"

export function tokensToExpression(tokens: FormulaToken[]): string {
  const segments = tokens.map((token) => {
    if (token.type === "metric") return token.metricId
    if (token.type === "operator") return ` ${token.value} `
    if (token.type === "paren") return token.value
    return ""
  })

  return segments.join("").replace(/\s+/g, " ").trim()
}
