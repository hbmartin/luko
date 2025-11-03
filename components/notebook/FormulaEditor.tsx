"use client"

import { useEffect, useMemo, useState } from "react"
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

  const [formulaReferencedIds, setFormulaReferencedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!formula?.expression) {
      setFormulaReferencedIds(new Set())
      return
    }
    const newIds = detectDependencies(formula.expression)
    if (newIds === undefined) return
    setFormulaReferencedIds(new Set(newIds))
  }, [formula?.expression])

  const [formulaExpressionMarkup, setFormulaExpressionMarkup] = useState<string | undefined>(undefined)
  const [draftExpression, setDraftExpression] = useState<string | null>(null)

  useEffect(() => {
    if (!formula) {
      setDraftExpression(null)
      setFormulaExpressionMarkup(undefined)
      return
    }

    let markup = formula.expression
    const sortedIds = [...formulaReferencedIds].sort((a, b) => b.length - a.length)
    for (const id of sortedIds) {
      markup = markup.replaceAll(id, `@[${referenceableIds[id]?.name ?? id}](${id})`)
    }
    setFormulaExpressionMarkup(markup)
    setDraftExpression(formula.expression)
  }, [formula, formulaReferencedIds, referenceableIds])

  const formulaValidation = useMemo(() => {
    if (!formula) return null
    return validateFormulaExpression({
      expression: draftExpression ?? formula.expression,
      referenceableIds,
    })
  }, [draftExpression, formula, referenceableIds])

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
        value={formulaExpressionMarkup ?? ""}
        placeholder="Build this formula by selecting metrics from the worksheet."
        className="mt-2"
        autoResize
        onMentionsChange={(change) => {
          setFormulaExpressionMarkup(change.value)
          const expressionWithIds = change.idValue ?? change.plainTextValue ?? ""
          setDraftExpression(expressionWithIds)
          const validation = validateFormulaExpression({
            expression: expressionWithIds,
            referenceableIds,
          })
          if (validation && validation.type === "error") {
            return
          }
          if (!onFormulaChange) return
          const normalizedExpression = expressionWithIds.trim()
          if (normalizedExpression === formula.expression) return
          onFormulaChange(formula.id, normalizedExpression)
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
