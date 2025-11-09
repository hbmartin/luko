"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { validateFormulaExpression } from "@/lib/formula-validation"
import { Metric, Notebook, SimulationResult } from "@/lib/types/notebook"
import { DataGridComponent } from "../DataGridComponent"
import { MetricDetailPanel } from "../MetricDetailPanel"
import { SimulationSummaryPanel } from "../SimulationSummaryPanel"

interface WorksheetTabProperties {
  notebook: Notebook
  onNotebookChange: (notebook: Notebook) => void
  density: "comfortable" | "compact"
  simulationResult?: SimulationResult | null
}

const reorder = <T,>(items: T[], sourceIndex: number, targetIndex: number): T[] => {
  if (sourceIndex === targetIndex) return items
  const next = [...items]
  const [removed] = next.splice(sourceIndex, 1)
  if (removed !== undefined) {
    next.splice(targetIndex, 0, removed)
  }
  return next
}

const createFormulaId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `formula_${Math.random().toString(36).slice(2, 10)}`
}

export function WorksheetTab({ notebook, onNotebookChange, density, simulationResult }: WorksheetTabProperties) {
  const historyReference = useRef<Notebook[]>([notebook])
  const historyIndexReference = useRef(0)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const referenceableItems = useMemo(
    () => Object.fromEntries([...notebook.metrics, ...notebook.formulas].map((item) => [item.id, item])),
    [notebook.metrics, notebook.formulas]
  )

  useEffect(() => {
    const existing = historyReference.current[historyIndexReference.current]
    if (existing?.updatedAt === notebook.updatedAt) return
    historyReference.current = [...historyReference.current.slice(0, historyIndexReference.current + 1), notebook]
    historyIndexReference.current = historyReference.current.length - 1
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

    globalThis.addEventListener("keydown", handleKey)
    return () => {
      globalThis.removeEventListener("keydown", handleKey)
    }
  })

  const commitNotebook = useCallback(
    (nextNotebook: Notebook) => {
      const timestamped = {
        ...nextNotebook,
        updatedAt: new Date().toISOString(),
      }
      historyReference.current = [...historyReference.current.slice(0, historyIndexReference.current + 1), timestamped]
      historyIndexReference.current = historyReference.current.length - 1
      onNotebookChange(timestamped)
    },
    [onNotebookChange]
  )

  const undo = useCallback(() => {
    if (historyIndexReference.current === 0) return
    historyIndexReference.current -= 1
    onNotebookChange(historyReference.current[historyIndexReference.current]!)
  }, [onNotebookChange])

  const redo = useCallback(() => {
    if (historyIndexReference.current >= historyReference.current.length - 1) return
    historyIndexReference.current += 1
    onNotebookChange(historyReference.current[historyIndexReference.current]!)
  }, [onNotebookChange])

  const handleMetricChange = useCallback(
    (metricId: string, field: "min" | "mode" | "max" | "value", value: number) => {
      const metrics = notebook.metrics.map((metric) => {
        if (metric.id !== metricId) return metric
        if (field === "value") {
          return { ...metric, value }
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
        dirtyMetrics: [...dirtySet],
        isDirty: true,
      })
    },
    [commitNotebook, notebook]
  )

  const handleMetricRename = useCallback(
    (metricId: string, name: string) => {
      const metrics = notebook.metrics.map((metric) => (metric.id === metricId ? { ...metric, name } : metric))

      const dirtySet = new Set(notebook.dirtyMetrics)
      dirtySet.add(metricId)

      commitNotebook({
        ...notebook,
        metrics,
        dirtyMetrics: [...dirtySet],
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
        expression: "",
        updatedAt: new Date().toISOString(),
      }

      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.add(newId)

      commitNotebook({
        ...notebook,
        formulas: [...notebook.formulas, newFormula],
        dirtyFormulas: [...dirtySet],
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
        dirtyFormulas: [...dirtySet],
        isDirty: true,
      })
    },
    [commitNotebook, notebook]
  )

  const handleFormulaChange = useCallback(
    (formulaId: string, expression: string) => {
      const validation = validateFormulaExpression({
        expression,
        referenceableIds: referenceableItems,
      })
      const formulas = notebook.formulas.map((formula) => {
        if (formula.id !== formulaId) return formula

        const { error: _oldError, ...baseFormula } = formula
        const updatedFormula = {
          ...baseFormula,
          expression,
          updatedAt: new Date().toISOString(),
        }

        if (validation?.type === "error") {
          return { ...updatedFormula, error: validation.message }
        }

        return updatedFormula
      })

      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.add(formulaId)

      commitNotebook({
        ...notebook,
        formulas,
        dirtyFormulas: [...dirtySet],
        isDirty: true,
      })
    },
    [commitNotebook, notebook, referenceableItems]
  )

  const handleFormulaRename = useCallback(
    (formulaId: string, name: string) => {
      const formulas = notebook.formulas.map((formula) => {
        if (formula.id !== formulaId) return formula

        return {
          ...formula,
          name,
          updatedAt: new Date().toISOString(),
        }
      })

      const dirtySet = new Set(notebook.dirtyFormulas)
      dirtySet.add(formulaId)

      commitNotebook({
        ...notebook,
        formulas,
        dirtyFormulas: [...dirtySet],
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
        if (sourceMetric === undefined) return
        const targetMetric = notebook.metrics[targetMetricIndex]
        if (sourceMetric?.categoryId !== targetMetric?.categoryId) return

        const metricsWithinCategory = notebook.metrics.filter((metric) => metric.categoryId === sourceMetric.categoryId)
        const sourcePosition = metricsWithinCategory.findIndex((metric) => metric.id === sourceId)
        const targetPosition = metricsWithinCategory.findIndex((metric) => metric.id === targetId)
        if (sourcePosition === -1 || targetPosition === -1) return

        const reorderedWithinCategory = reorder(metricsWithinCategory, sourcePosition, targetPosition)
        const mergedMetrics: Metric[] = []
        for (const metric of notebook.metrics) {
          if (metric.categoryId === sourceMetric?.categoryId) {
            const next = reorderedWithinCategory.shift()
            if (next) mergedMetrics.push(next)
          } else {
            mergedMetrics.push(metric)
          }
        }

        commitNotebook({
          ...notebook,
          metrics: mergedMetrics,
        })
      }
    },
    [commitNotebook, notebook]
  )

  const activeMetric = useMemo(
    () => notebook.metrics.find((metric) => metric.id === selectedRowId) ?? null,
    [notebook.metrics, selectedRowId]
  )

  const activeFormula = useMemo(
    () => notebook.formulas.find((candidate) => candidate.id === selectedRowId) ?? null,
    [notebook.formulas, selectedRowId]
  )

  return (
    <div className="mx-auto flex h-full min-h-0 flex-1 items-stretch gap-4 p-6">
      <DataGridComponent
        notebook={notebook}
        density={density}
        onMetricChange={handleMetricChange}
        onMetricRename={handleMetricRename}
        onCategoryToggle={handleCategoryToggle}
        onRowReorder={handleRowReorder}
        onOpenDetails={setSelectedRowId}
        onFormulaChange={handleFormulaChange}
        onFormulaRename={handleFormulaRename}
        onAddFormula={handleAddFormula}
        onDeleteFormula={handleDeleteFormula}
      />
      <div className="w-80 shrink-0 space-y-4">
        <MetricDetailPanel
          notebook={notebook}
          metric={activeMetric}
          formula={activeFormula}
          onFormulaChange={handleFormulaChange}
        />
        <SimulationSummaryPanel notebook={notebook} result={simulationResult ?? null} />
        {/* <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
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
        </div> */}
      </div>

      <div className="sr-only" aria-hidden>
        {notebook.metrics.map((metric) => {
          const fields = metric.validation?.fields
          if (!fields) return null
          return (
            <Fragment key={metric.id}>
              {fields.min && <span id={`${metric.id}-min-error`}>Min: {fields.min}</span>}
              {fields.mode && <span id={`${metric.id}-mode-error`}>Most likely: {fields.mode}</span>}
              {fields.max && <span id={`${metric.id}-max-error`}>Max: {fields.max}</span>}
              {fields.value && <span id={`${metric.id}-value-error`}>Value: {fields.value}</span>}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
