"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Metric, Notebook, SimulationResult } from "@/lib/types/notebook"
import { DataGridComponent } from "../DataGridComponent"
import { MetricDetailDrawer } from "../MetricDetailDrawer"
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
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    rowId: string
  } | null>(null)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

  useEffect(() => {
    const existing = historyRef.current[historyIndexRef.current]
    if (existing?.updatedAt === notebook.updatedAt) return
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current + 1), notebook]
    historyIndexRef.current = historyRef.current.length - 1
  }, [notebook])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener("click", closeMenu)
    return () => window.removeEventListener("click", closeMenu)
  }, [])

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

  const handleResetMetric = useCallback(
    (metricId: string) => {
      const originalMetric = originalNotebookRef.current.metrics.find((metric) => metric.id === metricId)
      if (!originalMetric) return

      const metrics = notebook.metrics.map((metric) => (metric.id === metricId ? originalMetric : metric))
      const dirtyMetrics = notebook.dirtyMetrics.filter((id) => id !== metricId)

      commitNotebook({
        ...notebook,
        metrics,
        dirtyMetrics,
        isDirty: dirtyMetrics.length > 0,
      })
    },
    [commitNotebook, notebook]
  )

  const handleZeroMetric = useCallback(
    (metricId: string) => {
      const metrics = notebook.metrics.map((metric) => {
        if (metric.id !== metricId) return metric
        if (metric.distribution) {
          return {
            ...metric,
            distribution: { min: 0, mode: 0, max: 0 },
          }
        }

        return { ...metric, value: 0 }
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

  const activeMetric = useMemo(
    () => notebook.metrics.find((metric) => metric.id === selectedMetricId) ?? null,
    [notebook.metrics, selectedMetricId]
  )

  return (
    <div className="flex h-full gap-4 space-y-6 p-6">
      <DataGridComponent
        notebook={notebook}
        density={density}
        validationErrors={validationErrors}
        onMetricChange={handleMetricChange}
        onCategoryToggle={handleCategoryToggle}
        onRowReorder={handleRowReorder}
        onOpenDetails={setSelectedMetricId}
        onContextRequest={({ rowId, clientX, clientY }) => setContextMenu({ rowId, x: clientX, y: clientY })}
      />
      <div className="w-80 shrink-0 space-y-4">
        <MetricDetailDrawer
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
          <p className="mt-2">Cmd/Ctrl+Z to undo, Cmd/Ctrl+Shift+Z to redo.</p>
        </div>
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="fixed z-30 w-48 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-2 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => {
              setSelectedMetricId(contextMenu.rowId)
              setContextMenu(null)
            }}
          >
            View details
          </button>
          <button
            type="button"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => {
              handleResetMetric(contextMenu.rowId)
              setContextMenu(null)
            }}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
            onClick={() => {
              handleZeroMetric(contextMenu.rowId)
              setContextMenu(null)
            }}
          >
            Zero out metric
          </button>
        </div>
      )}

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
