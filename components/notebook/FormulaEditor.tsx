"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import { validateFormulaExpression } from "@/lib/formula-validation"
import { detectDependencies } from "@/lib/math-utils"
import type { Formula, Notebook } from "@/lib/types/notebook"

type FormulaEditorProps = {
  notebook: Notebook
  formula: Formula | null
  onFormulaChange?: (formulaId: string, expression: string) => void
  className?: string
}

type MetricMentionExtra = {
  categoryId: Notebook["categories"][number]["id"]
  categoryName: Notebook["categories"][number]["name"]
  categoryType: Notebook["categories"][number]["type"]
  unit: Notebook["metrics"][number]["unit"]
  description?: Notebook["metrics"][number]["description"]
}

type MetricMentionItem = MentionDataItem<MetricMentionExtra>

export function FormulaEditor({ notebook, formula, onFormulaChange, className }: FormulaEditorProps) {
  const mentionOptions = useMemo<MetricMentionItem[]>(() => {
    const sortedCategories = [...notebook.categories].sort((a, b) => a.order - b.order)
    return sortedCategories.flatMap((category) => {
      const categoryMetrics = notebook.metrics.filter((candidate) => candidate.categoryId === category.id)
      return categoryMetrics.map<MetricMentionItem>((candidate) => ({
        id: candidate.id,
        display: candidate.name,
        categoryId: category.id,
        categoryName: category.name,
        categoryType: category.type,
        unit: candidate.unit,
        description: candidate.description,
      }))
    })
  }, [notebook.categories, notebook.metrics])

  const referenceableIds = useMemo(
    () => Object.fromEntries([...notebook.metrics, ...notebook.formulas].map((item) => [item.id, item])),
    [notebook.metrics, notebook.formulas]
  )

  const [draftExpression, setDraftExpression] = useState<string>(() => formula?.expression ?? "")
  const [formulaExpressionMarkup, setFormulaExpressionMarkup] = useState<string>(() => formula?.expression ?? "")
  const hasFormula = Boolean(formula)

  const lastSyncedFormulaRef = useRef<{ id: string | null; expression: string }>({
    id: formula?.id ?? null,
    expression: formula?.expression ?? "",
  })

  const buildMarkupFromExpression = useCallback(
    (expression: string): string => {
      if (!expression) return ""
      const detected = detectDependencies(expression)
      if (!detected || detected.size === 0) {
        return expression
      }
      const sortedIds = [...detected].sort((a, b) => b.length - a.length)
      return sortedIds.reduce((accumulator, id) => {
        const display = referenceableIds[id]?.name ?? id
        return accumulator.replaceAll(id, `@[${display}](${id})`)
      }, expression)
    },
    [referenceableIds]
  )

  useEffect(() => {
    if (!formula) {
      lastSyncedFormulaRef.current = { id: null, expression: "" }
      setDraftExpression("")
      setFormulaExpressionMarkup("")
      return
    }
    const { id, expression } = formula
    const { id: lastId, expression: lastExpression } = lastSyncedFormulaRef.current
    const idChanged = lastId !== id
    const expressionChanged = lastExpression !== expression

    if (!idChanged && !expressionChanged) {
      return
    }

    lastSyncedFormulaRef.current = { id, expression }
    setDraftExpression(expression)
    setFormulaExpressionMarkup(buildMarkupFromExpression(expression))
  }, [buildMarkupFromExpression, formula])

  const normalizedExpression = draftExpression

  useEffect(() => {
    if (!hasFormula) {
      setFormulaExpressionMarkup("")
      return
    }
    if (normalizedExpression === lastSyncedFormulaRef.current.expression) {
      setFormulaExpressionMarkup(buildMarkupFromExpression(normalizedExpression))
    }
  }, [buildMarkupFromExpression, hasFormula, normalizedExpression])

  const formulaValidation = useMemo(() => {
    if (!formula) return null
    return validateFormulaExpression({
      expression: normalizedExpression,
      referenceableIds,
    })
  }, [formula, normalizedExpression, referenceableIds])

  if (!formula) return null

  return (
    <div className={className}>
      <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{formula.name}</div>
      {formulaValidation ? (
        <p className={`mt-2 text-[10px] ${formulaValidation.type === "warning" ? "text-amber-500" : "text-red-500"}`}>
          {formulaValidation.message}
        </p>
      ) : null}
      <MentionsInput
        value={formulaExpressionMarkup}
        placeholder="Build this formula by selecting metrics from the worksheet."
        className="mt-2"
        autoResize
        onMentionsChange={(change) => {
          const expressionWithIds = change.idValue ?? change.plainTextValue ?? ""
          setFormulaExpressionMarkup(change.value)
          setDraftExpression(expressionWithIds)
          const validation = validateFormulaExpression({
            expression: expressionWithIds,
            referenceableIds,
          })
          if (validation && validation.type === "error") {
            return
          }
          if (!onFormulaChange) return
          const normalized = expressionWithIds.trim()
          if (normalized === formula.expression) return
          onFormulaChange(formula.id, normalized)
        }}
      >
        <Mention<MetricMentionExtra>
          data={mentionOptions}
          trigger="@"
          displayTransform={(id, display) => display ?? `${id}`}
        />
      </MentionsInput>
    </div>
  )
}
