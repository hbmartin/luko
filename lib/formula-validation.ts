import { parseFormula } from "@/lib/formulas"
import { detectDependencies } from "@/lib/math-utils"

export type FormulaValidationType = "error" | "warning"

export interface FormulaValidationResult {
  type: FormulaValidationType
  message: string
}

interface ReferenceableItem {
  name?: string
}

export interface FormulaValidationOptions {
  expression: string
  referenceableIds: Record<string, ReferenceableItem | undefined>
}

export const validateFormulaExpression = ({
  expression,
  referenceableIds,
}: FormulaValidationOptions): FormulaValidationResult | null => {
  const trimmed = expression.trim()

  if (!trimmed) {
    return {
      type: "error",
      message: "Start by selecting a metric",
    }
  }

  const dependencies = detectDependencies(trimmed)
  if (dependencies === undefined) {
    return {
      type: "error",
      message: "Formula is invalid",
    }
  }
  const missingIds = Array.from(dependencies).filter((dependency) => {
    if (referenceableIds[dependency]) {
      return false
    }

    try {
      const node = parseFormula(dependency)
      node.compile().evaluate({})
      return false
    } catch (error) {
      console.error(error)
      return true
    }
  })

  if (missingIds.length > 0) {
    const label = missingIds.length === 1 ? "Unknown reference" : "Unknown references"
    return {
      type: "error",
      message: `${label}: ${missingIds.join(", ")}`,
    }
  }

  try {
    parseFormula(trimmed)
  } catch (error) {
    console.error(error)
    return {
      type: "error",
      message: error instanceof Error ? error.message : "Formula is invalid",
    }
  }

  return null
}
