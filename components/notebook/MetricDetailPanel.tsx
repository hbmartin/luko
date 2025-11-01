"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Mention, type MentionDataItem, MentionsInput } from "react-mentions-ts"
import { DistributionChart } from "@/components/notebook/charts/DistributionChart"
import { parseFormula } from "@/lib/formulas"
import { detectDependencies } from "@/lib/math-utils"
import { Formula, Metric, Notebook } from "@/lib/types/notebook"

interface ValidationState {
  min?: string
  mode?: string
  max?: string
  value?: string
}

interface MetricDetailPanelProps {
  notebook: Notebook
  metric: Metric | null
  formula?: Formula | null
  metricValidation?: ValidationState
  formulaValidation?: string | undefined
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

export function MetricDetailPanel({
  notebook,
  metric,
  formula = null,
  metricValidation,
  formulaValidation,
  onFormulaChange,
}: MetricDetailPanelProps) {
  const distribution = metric?.distribution ?? null
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

  const formulaReferencedIds = useMemo<Set<string>>(() => {
    if (!formula?.expression) return new Set()
    console.log("formula.expression", formula.expression)
    console.log("detectDependencies(formula.expression)", detectDependencies(formula.expression))
    return detectDependencies(formula.expression)
  }, [formula?.expression])

  const [formulaExpressionMarkup, setFormulaExpressionMarkup] = useState<string | undefined>(undefined)
  const [formulaError, setFormulaError] = useState<string | null>(null)

  const validateFormulaExpression = useCallback(
    (expression: string): string | null => {
      const normalized = expression.trim()
      if (!normalized) {
        return null
      }

      try {
        parseFormula(normalized)
      } catch (error) {
        return error instanceof Error ? error.message : "Formula is invalid"
      }

      const dependencies = detectDependencies(normalized)
      const missingIds = Array.from(dependencies).filter((dependency) => {
        if (referenceableIds[dependency]) return false
        try {
          const node = parseFormula(dependency)
          node.compile().evaluate({})
          return false
        } catch {
          return true
        }
      })

      if (missingIds.length > 0) {
        const label = missingIds.length === 1 ? "Unknown reference" : "Unknown references"
        return `${label}: ${missingIds.join(", ")}`
      }

      return null
    },
    [referenceableIds]
  )

  useEffect(() => {
    if (!formula) return
    let markup = formula.expression
    const sortedIds = [...formulaReferencedIds].sort((a, b) => b.length - a.length)
    for (const id of sortedIds) {
      markup = markup.replaceAll(id, `@[${referenceableIds[id]?.name ?? id}](${id})`)
    }
    setFormulaExpressionMarkup(markup)
    setFormulaError(validateFormulaExpression(formula.expression))
  }, [formula, formulaReferencedIds, referenceableIds, validateFormulaExpression])
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
            {formulaError ? <p className="mt-2 text-[10px] text-red-500">{formulaError}</p> : null}
            <MentionsInput
              value={formulaExpressionMarkup ?? ""}
              placeholder="Build this formula by selecting metrics from the worksheet."
              className="mt-2"
              autoResize
              onMentionsChange={(change) => {
                console.log("change", change)
                setFormulaExpressionMarkup(change.value)
                const expressionWithIds = change.idValue ?? change.plainTextValue ?? ""
                const validationMessage = validateFormulaExpression(expressionWithIds)
                if (validationMessage) {
                  setFormulaError(validationMessage)
                  return
                }

                setFormulaError(null)
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
            {formulaValidation ? <p className="mt-2 text-[10px] text-red-500">{formulaValidation}</p> : null}
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
            {(metricValidation?.min || metricValidation?.mode || metricValidation?.max) && (
              <div className="mt-2 space-y-1 text-[10px]">
                {metricValidation?.min && <p className="text-red-500">Min: {metricValidation.min}</p>}
                {metricValidation?.mode && <p className="text-red-500">Most likely: {metricValidation.mode}</p>}
                {metricValidation?.max && <p className="text-red-500">Max: {metricValidation.max}</p>}
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
