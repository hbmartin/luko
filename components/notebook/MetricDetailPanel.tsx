"use client"

import { useEffect, useMemo, useState } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import { DistributionChart } from "@/components/notebook/charts/DistributionChart"
import { validateFormulaExpression } from "@/lib/formula-validation"
import { detectDependencies } from "@/lib/math-utils"
import { Formula, Metric, Notebook } from "@/lib/types/notebook"

interface MetricDetailPanelProps {
  notebook: Notebook
  metric: Metric | null
  formula?: Formula | null
  onFormulaChange?: (formulaId: string, expression: string) => void
}

type MetricMentionExtra = {
  categoryId: Notebook["categories"][number]["id"]
  categoryName: Notebook["categories"][number]["name"]
  categoryType: Notebook["categories"][number]["type"]
  unit: Notebook["metrics"][number]["unit"]
  description?: Notebook["metrics"][number]["description"]
}

type MetricMentionItem = MentionDataItem<MetricMentionExtra>

export function MetricDetailPanel({ notebook, metric, formula = null, onFormulaChange }: MetricDetailPanelProps) {
  const distribution = metric?.distribution ?? null
  const metricValidationFields = metric?.validation?.fields ?? {}
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
    if (!formula?.expression) return
    setFormulaReferencedIds((prev) => {
      const newIds = detectDependencies(formula.expression)
      if (!newIds) return prev
      return new Set([...prev, ...newIds])
    })
  }, [formula?.expression])

  const [formulaExpressionMarkup, setFormulaExpressionMarkup] = useState<string | undefined>(undefined)
  const [draftExpression, setDraftExpression] = useState<string | null>(null)

  useEffect(() => {
    if (!formula) return
    let markup = formula.expression
    const sortedIds = [...formulaReferencedIds].sort((a, b) => b.length - a.length)
    for (const id of sortedIds) {
      markup = markup.replaceAll(id, `@[${referenceableIds[id]?.name ?? id}](${id})`)
    }
    setFormulaExpressionMarkup(markup)
    setDraftExpression(formula.expression)
  }, [formula, formulaReferencedIds, referenceableIds])

  useEffect(() => {
    if (!formula) {
      setDraftExpression(null)
      setFormulaExpressionMarkup(undefined)
    }
  }, [formula])

  const formulaValidation = useMemo(() => {
    if (!formula) return null
    return validateFormulaExpression({
      expression: draftExpression ?? formula.expression,
      referenceableIds,
    })
  }, [draftExpression, formula, referenceableIds])

  if (!metric && !formula) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <p className="text-sm text-[var(--color-text-muted)]">Select a row to view more details.</p>
      </div>
    )
  }

  if (formula && !metric) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{formula.name}</div>
            {formulaValidation ? (
              <p
                className={`mt-2 text-[10px] ${
                  formulaValidation.type === "warning" ? "text-amber-500" : "text-red-500"
                }`}
              >
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

                // onFormulaChange is only called for valid formulas
                // check if this is desired behavior
                if (!formula) return
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

          {/* {noteSection} */}
        </div>
      </div>
    )
  }

  if (metric) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{metric.name}</div>
            {metric.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.description}</p>}
          </div>

          <section className="rounded-2xl">
            <div className="mt-3">
              {distribution ? (
                <DistributionChart metric={metric} distribution={distribution} />
              ) : (
                <div className="items-center justify-center">
                  <p className="p-8 text-center text-xs">
                    Please configure min, most likely, and max values for this metric.
                  </p>
                </div>
              )}
            </div>
            {(metricValidationFields.min || metricValidationFields.mode || metricValidationFields.max) && (
              <div className="mt-2 space-y-1 text-[10px]">
                {metricValidationFields.min && <p className="text-red-500">Min: {metricValidationFields.min}</p>}
                {metricValidationFields.mode && (
                  <p className="text-red-500">Most likely: {metricValidationFields.mode}</p>
                )}
                {metricValidationFields.max && <p className="text-red-500">Max: {metricValidationFields.max}</p>}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Unit: {metric.unit ?? "—"}</h4>
          </section>

          {/* {noteSection} */}

          {metric.formula && (
            <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Formula</h4>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">
                {metric.formula}
              </pre>
            </section>
          )}
        </div>
      </div>
    )
  }

  return null
}
