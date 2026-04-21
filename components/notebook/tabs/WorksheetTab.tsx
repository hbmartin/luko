"use client"

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { validateFormulaExpression } from "@/lib/formula-validation"
import { Formula, Metric, Notebook, SimulationResult } from "@/lib/types/notebook"
import { buildReferenceableIds, ReferenceableNotebookItem } from "@/lib/utils/notebook-indices"
import { DataGridComponent } from "../DataGridComponent"
import { MetricDetailPanel } from "../MetricDetailPanel"
import { SimulationSummaryPanel } from "../SimulationSummaryPanel"

type NotebookUpdate = Notebook | ((notebook: Notebook) => Notebook)

interface WorksheetTabProperties {
  notebook: Notebook
  onNotebookChange: (notebook: NotebookUpdate) => void
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
  if (globalThis.crypto !== undefined && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `formula_${Math.random().toString(36).slice(2, 10)}`
}

const useLatest = <T,>(value: T) => {
  const reference = useRef(value)
  reference.current = value
  return reference
}

interface WorksheetIndexMaps {
  categoryIndexById: Map<string, number>
  formulasById: Map<string, Formula>
  metricIndexById: Map<string, number>
  metricPositionById: Map<string, number>
  metricsById: Map<string, Metric>
}

const buildWorksheetIndexMaps = (
  notebook: Pick<Notebook, "categories" | "formulas" | "metrics">
): WorksheetIndexMaps => {
  const categoryIndexById = new Map<string, number>()
  const metricIndexById = new Map<string, number>()
  const metricPositionById = new Map<string, number>()
  const metricsById = new Map<string, Metric>()
  const formulasById = new Map<string, Formula>()
  const categoryMetricCounts = new Map<string, number>()

  for (const [index, category] of notebook.categories.entries()) {
    categoryIndexById.set(category.id, index)
  }

  for (const [index, metric] of notebook.metrics.entries()) {
    metricIndexById.set(metric.id, index)
    metricsById.set(metric.id, metric)
    const categoryPosition = categoryMetricCounts.get(metric.categoryId) ?? 0
    metricPositionById.set(metric.id, categoryPosition)
    categoryMetricCounts.set(metric.categoryId, categoryPosition + 1)
  }

  for (const formula of notebook.formulas) {
    formulasById.set(formula.id, formula)
  }

  return {
    categoryIndexById,
    formulasById,
    metricIndexById,
    metricPositionById,
    metricsById,
  }
}

const MetricValidationLiveRegion = memo(function MetricValidationLiveRegion({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="sr-only">
      {metrics.map((metric) => {
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
  )
})

export function WorksheetTab({ notebook, onNotebookChange, density, simulationResult }: WorksheetTabProperties) {
  const historyReference = useRef<Notebook[]>([notebook])
  const historyIndexReference = useRef(0)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const referenceableItems = useMemo(
    () => buildReferenceableIds({ metrics: notebook.metrics, formulas: notebook.formulas }),
    [notebook.formulas, notebook.metrics]
  )
  const indexMaps = useMemo(
    () => buildWorksheetIndexMaps(notebook),
    [notebook.categories, notebook.formulas, notebook.metrics]
  )
  const referenceableItemsReference = useLatest<ReadonlyMap<string, ReferenceableNotebookItem>>(referenceableItems)
  const indexMapsReference = useLatest(indexMaps)

  useEffect(() => {
    const existing = historyReference.current[historyIndexReference.current]
    if (existing?.updatedAt === notebook.updatedAt) return
    historyReference.current = [...historyReference.current.slice(0, historyIndexReference.current + 1), notebook]
    historyIndexReference.current = historyReference.current.length - 1
  }, [notebook])

  const commitNotebook = useCallback(
    (nextNotebook: NotebookUpdate) => {
      onNotebookChange((previous) => {
        const resolvedNotebook = typeof nextNotebook === "function" ? nextNotebook(previous) : nextNotebook
        const timestamped = {
          ...resolvedNotebook,
          updatedAt: new Date().toISOString(),
        }
        historyReference.current = [
          ...historyReference.current.slice(0, historyIndexReference.current + 1),
          timestamped,
        ]
        historyIndexReference.current = historyReference.current.length - 1
        return timestamped
      })
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

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      ) {
        return
      }

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
  }, [redo, undo])

  const handleMetricChange = useCallback(
    (metricId: string, field: "min" | "mode" | "max" | "value", value: number) => {
      commitNotebook((current) => {
        const metrics = current.metrics.map((metric) => {
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

        const dirtySet = new Set(current.dirtyMetrics)
        dirtySet.add(metricId)

        return {
          ...current,
          metrics,
          dirtyMetrics: [...dirtySet],
          isDirty: true,
        }
      })
    },
    [commitNotebook]
  )

  const handleMetricRename = useCallback(
    (metricId: string, name: string) => {
      commitNotebook((current) => {
        const metrics = current.metrics.map((metric) => (metric.id === metricId ? { ...metric, name } : metric))
        const dirtySet = new Set(current.dirtyMetrics)
        dirtySet.add(metricId)

        return {
          ...current,
          metrics,
          dirtyMetrics: [...dirtySet],
          isDirty: true,
        }
      })
    },
    [commitNotebook]
  )

  const handleAddFormula = useCallback(
    (categoryId: string): string => {
      const newId = createFormulaId()
      commitNotebook((current) => {
        const formulaCount = current.formulas.filter((formula) => formula.categoryId === categoryId).length
        const newFormula = {
          id: newId,
          name: `Formula ${formulaCount + 1}`,
          categoryId,
          expression: "",
          updatedAt: new Date().toISOString(),
        }

        const dirtySet = new Set(current.dirtyFormulas)
        dirtySet.add(newId)

        return {
          ...current,
          formulas: [...current.formulas, newFormula],
          dirtyFormulas: [...dirtySet],
          isDirty: true,
        }
      })

      return newId
    },
    [commitNotebook]
  )

  const handleDeleteFormula = useCallback(
    (formulaId: string) => {
      commitNotebook((current) => {
        const formulas = current.formulas.filter((formula) => formula.id !== formulaId)
        const dirtySet = new Set(current.dirtyFormulas)
        dirtySet.delete(formulaId)

        return {
          ...current,
          formulas,
          dirtyFormulas: [...dirtySet],
          isDirty: true,
        }
      })
    },
    [commitNotebook]
  )

  const handleFormulaChange = useCallback(
    (formulaId: string, expression: string) => {
      const validation = validateFormulaExpression({
        expression,
        referenceableIds: referenceableItemsReference.current,
      })
      commitNotebook((current) => {
        const formulas = current.formulas.map((formula) => {
          if (formula.id !== formulaId) return formula

          const updatedFormula = {
            ...formula,
            expression,
            updatedAt: new Date().toISOString(),
          }

          if (validation?.type === "error") {
            return { ...updatedFormula, error: validation.message }
          }

          delete updatedFormula.error
          return updatedFormula
        })

        const dirtySet = new Set(current.dirtyFormulas)
        dirtySet.add(formulaId)

        return {
          ...current,
          formulas,
          dirtyFormulas: [...dirtySet],
          isDirty: true,
        }
      })
    },
    [commitNotebook, referenceableItemsReference]
  )

  const handleFormulaRename = useCallback(
    (formulaId: string, name: string) => {
      commitNotebook((current) => {
        const formulas = current.formulas.map((formula) => {
          if (formula.id !== formulaId) return formula

          return {
            ...formula,
            name,
            updatedAt: new Date().toISOString(),
          }
        })

        const dirtySet = new Set(current.dirtyFormulas)
        dirtySet.add(formulaId)

        return {
          ...current,
          formulas,
          dirtyFormulas: [...dirtySet],
          isDirty: true,
        }
      })
    },
    [commitNotebook]
  )

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      commitNotebook((current) => {
        const categories = current.categories.map((category) =>
          category.id === categoryId ? { ...category, isExpanded: !category.isExpanded } : category
        )

        return {
          ...current,
          categories,
        }
      })
    },
    [commitNotebook]
  )

  const handleRowReorder = useCallback(
    (sourceId: string, targetId: string) => {
      const maps = indexMapsReference.current
      const sourceCategoryIndex = maps.categoryIndexById.get(sourceId)
      const targetCategoryIndex = maps.categoryIndexById.get(targetId)

      if (sourceCategoryIndex !== undefined && targetCategoryIndex !== undefined) {
        commitNotebook((current) => {
          const reorderedCategories = reorder(current.categories, sourceCategoryIndex, targetCategoryIndex).map(
            (category, index) => ({
              ...category,
              order: index,
            })
          )

          return {
            ...current,
            categories: reorderedCategories,
          }
        })
        return
      }

      const sourceMetricIndex = maps.metricIndexById.get(sourceId)
      const targetMetricIndex = maps.metricIndexById.get(targetId)

      if (sourceMetricIndex === undefined || targetMetricIndex === undefined) return

      const sourceMetric = maps.metricsById.get(sourceId)
      const targetMetric = maps.metricsById.get(targetId)
      if (!sourceMetric || !targetMetric || sourceMetric.categoryId !== targetMetric.categoryId) return

      const sourcePosition = maps.metricPositionById.get(sourceId)
      const targetPosition = maps.metricPositionById.get(targetId)
      if (sourcePosition === undefined || targetPosition === undefined) return

      commitNotebook((current) => {
        const metricsWithinCategory = current.metrics.filter((metric) => metric.categoryId === sourceMetric.categoryId)
        const reorderedWithinCategory = reorder(metricsWithinCategory, sourcePosition, targetPosition)
        let nextMetricIndex = 0
        const mergedMetrics: Metric[] = []
        for (const metric of current.metrics) {
          if (metric.categoryId === sourceMetric.categoryId) {
            const next = reorderedWithinCategory[nextMetricIndex]
            nextMetricIndex += 1
            if (next) mergedMetrics.push(next)
          } else {
            mergedMetrics.push(metric)
          }
        }

        return {
          ...current,
          metrics: mergedMetrics,
        }
      })
    },
    [commitNotebook, indexMapsReference]
  )

  const activeMetric = selectedRowId ? (indexMaps.metricsById.get(selectedRowId) ?? null) : null

  const activeFormula = selectedRowId ? (indexMaps.formulasById.get(selectedRowId) ?? null) : null

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
      </div>

      <MetricValidationLiveRegion metrics={notebook.metrics} />
    </div>
  )
}
