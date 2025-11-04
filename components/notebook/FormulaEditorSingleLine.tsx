"use client"

import { useMemo } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import type { Formula, Notebook } from "@/lib/types/notebook"
import { buildFormulaMarkup } from "./utils/formulaMarkup"

type FormulaEditorSingleLineProps = {
  notebook: Notebook
  formulaId: Formula["id"] | null
  className?: string
}

export type MetricMentionExtra = {
  categoryId: Notebook["categories"][number]["id"]
  categoryName: Notebook["categories"][number]["name"]
  categoryType: Notebook["categories"][number]["type"]
  unit: Notebook["metrics"][number]["unit"]
  description?: Notebook["metrics"][number]["description"]
}

export type MetricMentionItem = MentionDataItem<MetricMentionExtra>

export function FormulaEditorSingleLine({ notebook, formulaId, className }: FormulaEditorSingleLineProps) {
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

  const formula = useMemo(() => {
    if (!formulaId) return null
    return notebook.formulas.find((candidate) => candidate.id === formulaId) ?? null
  }, [notebook.formulas, formulaId])

  const formulaExpressionMarkup = useMemo(() => {
    if (!formula) return ""
    return buildFormulaMarkup(formula.expression, referenceableIds)
  }, [formula, referenceableIds])

  if (!formula) return null

  return (
    <MentionsInput value={formulaExpressionMarkup} singleLine readOnly className={className}>
      <Mention<MetricMentionExtra>
        data={mentionOptions}
        trigger="@"
        displayTransform={(id, display) => display ?? `${id}`}
      />
    </MentionsInput>
  )
}
