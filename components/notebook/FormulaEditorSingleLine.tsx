"use client"

import { useMemo } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import type { Formula, Notebook } from "@/lib/types/notebook"
import { buildReferenceableIds } from "@/lib/utils/notebook-indices"
import { useNotebookSelector } from "./NotebookProvider"
import { buildFormulaMarkup } from "./utils/formulaMarkup"

type FormulaEditorSingleLineProperties = {
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

export function FormulaEditorSingleLine({ formulaId, className }: FormulaEditorSingleLineProperties) {
  const categories = useNotebookSelector((state) => state.notebook.categories)
  const metrics = useNotebookSelector((state) => state.notebook.metrics)
  const formulas = useNotebookSelector((state) => state.notebook.formulas)
  const formula = useNotebookSelector((state) => {
    if (!formulaId) return null
    return state.notebook.formulas.find((candidate) => candidate.id === formulaId) ?? null
  })

  const mentionOptions = useMemo<MetricMentionItem[]>(() => {
    const sortedCategories = categories.toSorted((a, b) => a.order - b.order)
    return sortedCategories.flatMap((category) => {
      const categoryMetrics = metrics.filter((candidate) => candidate.categoryId === category.id)
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
  }, [categories, metrics])

  const referenceableIds = useMemo(() => buildReferenceableIds({ metrics, formulas }), [formulas, metrics])

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
