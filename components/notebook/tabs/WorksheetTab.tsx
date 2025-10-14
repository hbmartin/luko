"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { parseFormula } from "@/lib/formula/parser"
import { FormulaToken, Metric, Notebook, SimulationResult } from "@/lib/types/notebook"
import { tokensToExpression } from "@/lib/utils/formulaTokens"
import { DataGridComponent } from "../DataGridComponent"
import { MetricDetailPanel } from "../MetricDetailPanel"
import { SimulationSummaryPanel } from "../SimulationSummaryPanel"

type ValidationState = {
  min?: string
  mode?: string
  max?: string
  value?: string
}

interface WorksheetTabProps {
  notebook: Notebook
  onNotebookChange: (notebook: Notebook) => void
  density: "comfortable" | "compact"
  simulationResult?: SimulationResult | null
}

const reorder = <T,>(items: T[], sourceIndex: number, targetIndex: number): T[] => {
  if (sourceIndex === targetIndex) return items
  const next = [...items]
  const [removed] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, removed)
  return next
}

const createFormulaId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `formula-${Math.random().toString(36).slice(2, 10)}`
}

const validateMetric = (metric: Metric): ValidationState | undefined => {
  if (!metric.distribution) return undefined
  const { min, mode, max } = metric.distribution
  const errors: ValidationState = {}

  if (min === undefined || Number.isNaN(min)) {
    errors.min = "Required"
  }
  if (mode === undefined || Number.isNaN(mode)) {
    errors.mode = "Required"
  }
  if (max === undefined || Number.isNaN(max)) {
    errors.max = "Required"
  }

  if (errors.min || errors.mode || errors.max) return errors

  if (min > mode) {
    errors.min = "Min must be ≤ Most likely"
  }
  if (mode > max) {
    errors.max = "Max must be ≥ Most likely"
  }
  if (min > max) {
    errors.min = "Min must be ≤ Max"
    errors.max = "Max must be ≥ Min"
  }

  return Object.keys(errors).length ? errors : undefined
}

export function WorksheetTab({ notebook, onNotebookChange, density, simulationResult }: WorksheetTabProps) {
  const originalNotebookRef = useRef(notebook)
  const historyRef = useRef<Notebook[]>([notebook])
  const historyIndexRef = useRef(0)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

  useEffect(() => {
    const existing = historyRef.current[historyIndexRef.current]
    if (existing?.updatedAt === notebook.updatedAt) return
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current + 1), notebook]
    historyIndexRef.current = historyRef.current.length - 1
  }, [notebook])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const controlOrMeta = event.metaKey || event.ctrlKey
      if (!controlOrMeta) return
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  const validationErrors = useMemo(() => {
    const errors: Record<string, ValidationState | undefined> = {}
    notebook.metrics.forEach((metric) => {
      const metricErrors = validateMetric(metric)
      if (metricErrors) {
        errors[metric.id] = metricErrors
      }
    })
    return errors
  }, [notebook.metrics])

  const formulaValidation = useMemo(() => {
    const errors: Record<string, string | null> = {}
    const metricsById = new Map(notebook.metrics.map((metric) => [metric.id, metric]))

    notebook.formulas.forEach((formula) => {
      if (!formula.tokens.length) {
        errors[formula.id] = "Start by selecting a metric"
        return
      }

      const missingMetric = formula.tokens.find((token) => token.type === "metric" && !metricsById.has(token.metricId))

      if (missingMetric) {
        errors[formula.id] = "Referenced metric no longer exists"
        return
      }

      const expression = tokensToExpression(formula.tokens)
      if (!expression) {
        errors[formula.id] = "Formula is incomplete"
        return
      }

      try {
        parseFormula(expression)
        errors[formula.id] = null
      } catch (error) {
        errors[formula.id] = error instanceof Error ? error.message : "Formula is invalid"
      }
    })

    return errors
  }, [notebook.formulas, notebook.metrics])

  const commitNotebook = useCallback(
    (nextNotebook: Notebook) => {
      const timestamped = {
        ...nextNotebook,
        updatedAt: new Date().toISOString(),
      }
      historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current + 1), timestamped]
      historyIndexRef.current = historyRef.current.length - 1
      onNotebookChange(timestamped)
    },
    [onNotebookChange]
  )

  const undo = useCallback(() => {
    if (historyIndexRef.current === 0) return
    historyIndexRef.current -= 1
    onNotebookChange(historyRef.current[historyIndexRef.current])
  }, [onNotebookChange])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    onNotebookChange(historyRef.current[historyIndexRef.current])
  }, [onNotebookChange])

  const handleMetricChange = useCallback(
    (metricId: string, field: "min" | "mode" | "max" | "value", value: number) => {
      const metrics = notebook.metrics.map((metric) => {
        if (metric.id !== metricId) return metric
        if (field === "value") {
          return { ...metric, value }
        }
        if (!metric.distribution) {
          return metric
        }
        return {
          ...metric,
          distribution: {
            ...metric.distribution,
            [field]: value,
          },
        }
      })

      const dirtySet = new Set(notebook.dirtyMetrics)
      dirtySet.add(metricId)

      commitNotebook({
        ...notebook,
        metrics,
        dirtyMetrics: Array.from(dirtySet),
        isDirty: true,
      })
    },
    [commitNotebook, notebook]
  )

  const handleAddFormula = useCallback(
    (categoryId: string): string => {
      const newId = createFormulaId()
      const formulaCount = notebook.formulas.filter((formula) => formula.categoryId === categoryId).length
      const newFormula = {
        id: newId,
        name: `Formula ${formulaCount + 1}`,
        categoryId,
        tokens: [] as FormulaToken[],
        updatedAt: new Date().toISOString(),
      }

      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.add(newId)

      commitNotebook({
        ...notebook,
        formulas: [...notebook.formulas, newFormula],
        dirtyFormulas: Array.from(dirtySet),
        isDirty: true,
      })

      return newId
    },
    [commitNotebook, notebook]
  )

  const handleDeleteFormula = useCallback(
    (formulaId: string) => {
      const formulas = notebook.formulas.filter((formula) => formula.id !== formulaId)
      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.delete(formulaId)

      commitNotebook({
        ...notebook,
        formulas,
        dirtyFormulas: Array.from(dirtySet),
        isDirty: true,
      })
    },
    [commitNotebook, notebook]
  )

  const handleFormulaChange = useCallback(
    (formulaId: string, tokens: FormulaToken[]) => {
      const formulas = notebook.formulas.map((formula) =>
        formula.id === formulaId
          ? {
              ...formula,
              tokens,
              updatedAt: new Date().toISOString(),
            }
          : formula
      )

      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.add(formulaId)

      commitNotebook({
        ...notebook,
        formulas,
        dirtyFormulas: Array.from(dirtySet),
        isDirty: true,
      })
    },
    [commitNotebook, notebook]
  )

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      const categories = notebook.categories.map((category) =>
        category.id === categoryId ? { ...category, isExpanded: !category.isExpanded } : category
      )

      commitNotebook({
        ...notebook,
        categories,
      })
    },
    [commitNotebook, notebook]
  )

  const handleRowReorder = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceCategoryIndex = notebook.categories.findIndex((category) => category.id === sourceId)
      const targetCategoryIndex = notebook.categories.findIndex((category) => category.id === targetId)

      if (sourceCategoryIndex !== -1 && targetCategoryIndex !== -1) {
        const reorderedCategories = reorder(notebook.categories, sourceCategoryIndex, targetCategoryIndex).map(
          (category, index) => ({
            ...category,
            order: index,
          })
        )

        commitNotebook({
          ...notebook,
          categories: reorderedCategories,
        })
        return
      }

      const sourceMetricIndex = notebook.metrics.findIndex((metric) => metric.id === sourceId)
      const targetMetricIndex = notebook.metrics.findIndex((metric) => metric.id === targetId)

      if (sourceMetricIndex !== -1 && targetMetricIndex !== -1) {
        const sourceMetric = notebook.metrics[sourceMetricIndex]
        const targetMetric = notebook.metrics[targetMetricIndex]
        if (sourceMetric?.categoryId !== targetMetric?.categoryId) return

        const metricsWithinCategory = notebook.metrics.filter((metric) => metric.categoryId === sourceMetric.categoryId)
        const sourcePosition = metricsWithinCategory.findIndex((metric) => metric.id === sourceId)
        const targetPosition = metricsWithinCategory.findIndex((metric) => metric.id === targetId)
        if (sourcePosition === -1 || targetPosition === -1) return

        const reorderedWithinCategory = reorder(metricsWithinCategory, sourcePosition, targetPosition)
        const mergedMetrics: Metric[] = []
        notebook.metrics.forEach((metric) => {
          if (metric.categoryId !== sourceMetric?.categoryId) {
            mergedMetrics.push(metric)
          } else {
            const next = reorderedWithinCategory.shift()
            if (next) mergedMetrics.push(next)
          }
        })

        commitNotebook({
          ...notebook,
          metrics: mergedMetrics,
        })
      }
    },
    [commitNotebook, notebook]
  )

  const activeMetric = useMemo(
    () => notebook.metrics.find((metric) => metric.id === selectedMetricId) ?? null,
    [notebook.metrics, selectedMetricId]
  )

  return (
    <div className="mx-auto flex h-full min-h-0 flex-1 items-stretch gap-4 p-6">
      <DataGridComponent
        notebook={notebook}
        density={density}
        validationErrors={validationErrors}
        onMetricChange={handleMetricChange}
        onCategoryToggle={handleCategoryToggle}
        onRowReorder={handleRowReorder}
        onOpenDetails={setSelectedMetricId}
        onFormulaChange={handleFormulaChange}
        formulaValidation={formulaValidation}
        onAddFormula={handleAddFormula}
        onDeleteFormula={handleDeleteFormula}
      />
      <div className="w-80 shrink-0 space-y-4">
        <MetricDetailPanel
          metric={activeMetric}
          validation={activeMetric ? validationErrors[activeMetric.id] : undefined}
        />
        <SimulationSummaryPanel notebook={notebook} result={simulationResult ?? null} />
        <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">History</span>
            <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <button
                type="button"
                onClick={undo}
                className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs font-medium hover:bg-[var(--color-surface-muted)]"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={redo}
                className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs font-medium hover:bg-[var(--color-surface-muted)]"
              >
                Redo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sr-only" aria-hidden>
        {Object.entries(validationErrors).map(([metricId, errors]) => (
          <Fragment key={metricId}>
            {errors?.min && <span id={`${metricId}-min-error`}>{errors.min}</span>}
            {errors?.mode && <span id={`${metricId}-mode-error`}>{errors.mode}</span>}
            {errors?.max && <span id={`${metricId}-max-error`}>{errors.max}</span>}
            {errors?.value && <span id={`${metricId}-value-error`}>{errors.value}</span>}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
