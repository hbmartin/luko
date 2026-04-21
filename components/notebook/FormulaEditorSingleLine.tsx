"use client"

import { memo, useMemo } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import type { Formula, Notebook } from "@/lib/types/notebook"
import type { ReferenceableNotebookItem } from "@/lib/utils/notebook-indices"
import { buildFormulaMarkup } from "./utils/formulaMarkup"

type FormulaEditorSingleLineProperties = {
  formulaId: Formula["id"] | null
  expression: Formula["expression"]
  mentionOptions: MetricMentionItem[]
  referenceableIds: ReadonlyMap<string, ReferenceableNotebookItem>
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

const displayMention = (id: number | string, display?: string | null) => display ?? String(id)

export const FormulaEditorSingleLine = memo(function FormulaEditorSingleLine({
  formulaId,
  expression,
  mentionOptions,
  referenceableIds,
  className,
}: FormulaEditorSingleLineProperties) {
  const formulaExpressionMarkup = useMemo(() => {
    if (!formulaId) return ""
    return buildFormulaMarkup(expression, referenceableIds)
  }, [expression, formulaId, referenceableIds])

  if (!formulaId) return null

  return (
    <MentionsInput value={formulaExpressionMarkup} singleLine readOnly className={className}>
      <Mention<MetricMentionExtra> data={mentionOptions} trigger="@" displayTransform={displayMention} />
    </MentionsInput>
  )
})
