"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Mention, MentionsInput, type MentionsInputChangeEvent } from "react-mentions-ts"
import { validateFormulaExpression } from "@/lib/formula-validation"
import type { Formula, Notebook } from "@/lib/types/notebook"
import {
  buildMentionOptions,
  buildReferenceableIds,
  type MetricMentionExtra,
  type MetricMentionItem,
  type ReferenceableNotebookItem,
} from "@/lib/utils/notebook-indices"
import { buildFormulaMarkup } from "./utils/formulaMarkup"

type FormulaEditorProperties = {
  notebook: Notebook
  formula: Formula | null
  onFormulaChange?: (formulaId: string, expression: string) => void
  className?: string
}

const alphabeticalTrigger = /(?:^|\s)((\p{L}+))$/u
const displayMention = (id: number | string, display?: string | null) => display ?? String(id)

export function FormulaEditor({ notebook, formula, onFormulaChange, className }: FormulaEditorProperties) {
  const mentionOptions = useMemo<MetricMentionItem[]>(
    () => buildMentionOptions(notebook),
    [notebook.categories, notebook.metrics]
  )

  const referenceableIds = useMemo(
    () => buildReferenceableIds({ metrics: notebook.metrics, formulas: notebook.formulas }),
    [notebook.formulas, notebook.metrics]
  )

  if (!formula) return null

  return (
    <FormulaEditorBody
      key={formula.id}
      className={className}
      formula={formula}
      mentionOptions={mentionOptions}
      onFormulaChange={onFormulaChange}
      referenceableIds={referenceableIds}
    />
  )
}

interface FormulaEditorBodyProperties {
  className?: string
  formula: Formula
  mentionOptions: MetricMentionItem[]
  onFormulaChange?: (formulaId: string, expression: string) => void
  referenceableIds: ReadonlyMap<string, ReferenceableNotebookItem>
}

function FormulaEditorBody({
  className,
  formula,
  mentionOptions,
  onFormulaChange,
  referenceableIds,
}: FormulaEditorBodyProperties) {
  const [draftExpression, setDraftExpression] = useState(formula.expression)
  const [draftMarkup, setDraftMarkup] = useState(() => buildFormulaMarkup(formula.expression, referenceableIds))
  const lastSyncedFormulaReference = useRef({ id: formula.id, expression: formula.expression })
  const trimmedDraftExpression = draftExpression.trim()
  const formulaCaughtUpToDraft = formula.expression === draftExpression || formula.expression === trimmedDraftExpression
  const isDraftSynced =
    formulaCaughtUpToDraft || trimmedDraftExpression === lastSyncedFormulaReference.current.expression
  const normalizedExpression = isDraftSynced ? formula.expression : draftExpression
  const deferredNormalizedExpression = useDeferredValue(normalizedExpression)
  const canonicalMarkup = useMemo(
    () => buildFormulaMarkup(normalizedExpression, referenceableIds),
    [normalizedExpression, referenceableIds]
  )
  const formulaExpressionMarkup = isDraftSynced ? canonicalMarkup : draftMarkup

  // If formula.expression catches draftExpression, refresh lastSyncedFormulaReference.
  // If draftExpression diverged from it, preserve edits; otherwise sync via setDraftExpression
  // and setDraftMarkup(buildFormulaMarkup(..., referenceableIds)).
  useEffect(() => {
    if (formula.expression === draftExpression || formula.expression === trimmedDraftExpression) {
      lastSyncedFormulaReference.current = { id: formula.id, expression: formula.expression }
      if (formula.expression !== draftExpression) {
        setDraftExpression(formula.expression)
        setDraftMarkup(buildFormulaMarkup(formula.expression, referenceableIds))
      }
      return
    }

    if (
      draftExpression !== lastSyncedFormulaReference.current.expression &&
      trimmedDraftExpression !== lastSyncedFormulaReference.current.expression
    ) {
      return
    }

    lastSyncedFormulaReference.current = { id: formula.id, expression: formula.expression }
    setDraftExpression(formula.expression)
    setDraftMarkup(buildFormulaMarkup(formula.expression, referenceableIds))
  }, [draftExpression, formula.expression, formula.id, referenceableIds, trimmedDraftExpression])

  const formulaValidation = useMemo(() => {
    return validateFormulaExpression({
      expression: deferredNormalizedExpression,
      referenceableIds,
    })
  }, [deferredNormalizedExpression, referenceableIds])

  const handleMentionsChange = useCallback(
    (change: MentionsInputChangeEvent<MetricMentionExtra>) => {
      const expressionWithIds = change.idValue ?? change.plainTextValue ?? ""
      setDraftMarkup(change.value)
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
    },
    [formula.expression, formula.id, onFormulaChange, referenceableIds]
  )

  return (
    <div className={className}>
      <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{formula.name}</div>
      <MentionsInput
        value={formulaExpressionMarkup}
        placeholder="Build this formula by selecting metrics from the worksheet."
        className="mt-2"
        autoResize
        onMentionsChange={handleMentionsChange}
      >
        <Mention<MetricMentionExtra>
          data={mentionOptions}
          trigger={alphabeticalTrigger}
          displayTransform={displayMention}
        />
      </MentionsInput>
      {formulaValidation ? (
        <p className={`mt-2 text-[10px] ${formulaValidation.type === "warning" ? "text-warning" : "text-error"}`}>
          {formulaValidation.message}
        </p>
      ) : null}
    </div>
  )
}
