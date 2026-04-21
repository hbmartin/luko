"use client"

import { memo, useMemo } from "react"
import { Mention, MentionsInput } from "react-mentions-ts"
import type { Formula } from "@/lib/types/notebook"
import type { MetricMentionExtra, MetricMentionItem, ReferenceableNotebookItem } from "@/lib/utils/notebook-indices"
import { buildFormulaMarkup } from "./utils/formulaMarkup"

type FormulaEditorSingleLineProperties = {
  formulaId: Formula["id"] | null
  expression: Formula["expression"]
  mentionOptions: MetricMentionItem[]
  referenceableIds: ReadonlyMap<string, ReferenceableNotebookItem>
  inputClassName?: string
}

const displayMention = (id: number | string, display?: string | null) => display ?? String(id)

export const FormulaEditorSingleLine = memo(function FormulaEditorSingleLine({
  formulaId,
  expression,
  mentionOptions,
  referenceableIds,
  inputClassName,
}: FormulaEditorSingleLineProperties) {
  const formulaExpressionMarkup = useMemo(() => {
    if (!formulaId) return ""
    return buildFormulaMarkup(expression, referenceableIds)
  }, [expression, formulaId, referenceableIds])

  if (!formulaId) return <></>

  return (
    <MentionsInput value={formulaExpressionMarkup} singleLine readOnly className={inputClassName}>
      <Mention<MetricMentionExtra> data={mentionOptions} trigger="@" displayTransform={displayMention} />
    </MentionsInput>
  )
})
