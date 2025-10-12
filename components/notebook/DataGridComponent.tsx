"use client"

import { useCallback, useMemo, useRef } from "react"
import type { GridRow, Notebook } from "@/lib/types/notebook"
import { formatCurrency, formatNumber, notebookToGridRows } from "@/lib/utils/grid-helpers"
import { GridAdapter, type GridAdapterColumn } from "./grid/GridAdapter"
import type { CellMouseArgs, CellSelectArgs } from "react-data-grid"

interface ValidationState {
  min?: string
  mode?: string
  max?: string
  value?: string
}

interface DataGridComponentProps {
  notebook: Notebook
  density: "comfortable" | "compact"
  validationErrors: Record<string, ValidationState | undefined>
  onMetricChange: (metricId: string, field: "min" | "mode" | "max" | "value", value: number) => void
  onCategoryToggle: (categoryId: string) => void
  onRowReorder: (sourceId: string, targetId: string) => void
  onOpenDetails: (metricId: string) => void
  onContextRequest: (params: { rowId: string; clientX: number; clientY: number }) => void
}

export function DataGridComponent({
  notebook,
  density,
  validationErrors,
  onMetricChange,
  onCategoryToggle,
  onRowReorder,
  onOpenDetails,
  onContextRequest,
}: DataGridComponentProps) {
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])
  const columns = useMemo<GridAdapterColumn<GridRow>[]>(() => {
    const numericCellClass = "spreadsheet-cell-numeric"
    const unitCellClass = "spreadsheet-cell-unit"
    const summaryCellClass = "spreadsheet-cell-summary"

    const renderDistributionInput = (row: GridRow, field: "min" | "max") => {
      if (row.type === "category") return null

      if (row.value !== null) {
        return <span className="spreadsheet-fixed-value">{formatNumber(row.value, 2)}</span>
      }

      const error = validationErrors[row.id]?.[field]
      const defaultValue = row[field] ?? ""

      return (
        <input
          type="number"
          key={`${row.id}-${field}-${defaultValue}`}
          defaultValue={defaultValue}
          onBlur={(event) => {
            const nextValue = Number.parseFloat(event.currentTarget.value)
            if (!Number.isNaN(nextValue)) {
              onMetricChange(row.id, field, nextValue)
            }
          }}
          data-validation={error ? "error" : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${row.id}-${field}-error` : undefined}
          className="spreadsheet-input"
        />
      )
    }

    const renderModeInput = (row: GridRow) => {
      if (row.type === "category") return null

      const error = validationErrors[row.id]?.mode
      const isFixed = row.value !== null
      const defaultValue = (isFixed ? row.value : row.mode) ?? ""

      return (
        <input
          type="number"
          key={`${row.id}-mode-${defaultValue}`}
          defaultValue={defaultValue}
          onBlur={(event) => {
            const nextValue = Number.parseFloat(event.currentTarget.value)
            if (!Number.isNaN(nextValue)) {
              onMetricChange(row.id, isFixed ? "value" : "mode", nextValue)
            }
          }}
          data-validation={error ? "error" : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${row.id}-mode-error` : undefined}
          className="spreadsheet-input"
        />
      )
    }

    return [
      {
        key: "name",
        name: "Metric",
        width: 320,
        frozen: true,
        cellClass: "spreadsheet-cell-name",
        render: ({ row }) => {
          if (row.type === "category") {
            return (
              <div className="spreadsheet-category">
                <button
                  type="button"
                  onClick={() => onCategoryToggle(row.id)}
                  className="spreadsheet-category-toggle"
                  aria-label={row.isExpanded ? "Collapse category" : "Expand category"}
                >
                  {row.isExpanded ? "−" : "+"}
                </button>
                <span className="spreadsheet-category-label">{row.name}</span>
              </div>
            )
          }

          return (
            <div className="spreadsheet-metric">
              <div>
                <p className="spreadsheet-metric-name">{row.name}</p>
                {row.description ? <p className="spreadsheet-metric-description">{row.description}</p> : null}
              </div>
            </div>
          )
        },
      },
      {
        key: "unit",
        name: "Unit",
        width: 120,
        cellClass: unitCellClass,
        render: ({ row }) => {
          if (row.type === "category" || !row.unit) return null
          return <span className="spreadsheet-unit">{row.unit}</span>
        },
      },
      {
        key: "min",
        name: "Min",
        width: 120,
        cellClass: numericCellClass,
        render: ({ row }) => renderDistributionInput(row, "min"),
      },
      {
        key: "mode",
        name: "Most Likely",
        width: 140,
        cellClass: numericCellClass,
        render: ({ row }) => renderModeInput(row),
      },
      {
        key: "max",
        name: "Max",
        width: 120,
        cellClass: numericCellClass,
        render: ({ row }) => renderDistributionInput(row, "max"),
      },
      {
        key: "summary",
        name: "Summary",
        width: 220,
        cellClass: summaryCellClass,
        render: ({ row }) => {
          if (row.type === "category") {
            return <div className="spreadsheet-summary">{row.isExpanded ? "Hide metrics" : "Show metrics"}</div>
          }

          if (row.formula) {
            return (
              <div className="spreadsheet-summary">
                Formula
                <code className="spreadsheet-formula">{row.formula}</code>
              </div>
            )
          }

          if (row.value !== null) {
            const format = row.unit?.includes("$") ? formatCurrency : formatNumber
            return (
              <div className="spreadsheet-summary">
                Fixed at <span className="spreadsheet-summary-strong">{format(row.value)}</span>
              </div>
            )
          }

          const min = row.min ? formatNumber(row.min) : "—"
          const mode = row.mode ? formatNumber(row.mode) : "—"
          const max = row.max ? formatNumber(row.max) : "—"
          return (
            <div className="spreadsheet-summary">
              Range {min} → {mode} → {max}
            </div>
          )
        },
      },
    ]
  }, [onCategoryToggle, onMetricChange, validationErrors])
  const rowClass = useCallback((row: GridRow) => {
    const classes = ["spreadsheet-row"]
    if (row.type === "category") classes.push("spreadsheet-row-category")
    if (row.isDirty) classes.push("spreadsheet-row-dirty")
    return classes.join(" ")
  }, [])

  const lastDetailsTriggerRef = useRef<{ id: string; time: number } | null>(null)

  const triggerDetails = useCallback(
    (rowId: string) => {
      const now = Date.now()
      const lastTrigger = lastDetailsTriggerRef.current
      if (lastTrigger && lastTrigger.id === rowId && now - lastTrigger.time < 100) {
        return
      }
      lastDetailsTriggerRef.current = { id: rowId, time: now }
      onOpenDetails(rowId)
    },
    [onOpenDetails]
  )

  const handleCellClick = useCallback(
    ({ row }: CellMouseArgs<GridRow>) => {
      if (row.type !== "metric") return
      triggerDetails(row.id)
    },
    [triggerDetails]
  )

  const handleCellFocus = useCallback(
    ({ row }: CellSelectArgs<GridRow>) => {
      if (!row || row.type !== "metric") return
      triggerDetails(row.id)
    },
    [triggerDetails]
  )

  return (
    <GridAdapter
      density={density}
      rows={rows}
      columns={columns}
      onRowReorder={onRowReorder}
      onContextMenu={(event, row) => {
        if (row.type === "metric") {
          onContextRequest({ rowId: row.id, clientX: event.clientX, clientY: event.clientY })
        }
      }}
      rowClass={rowClass}
      onCellClick={handleCellClick}
      onSelectedCellChange={handleCellFocus}
    />
  )
}

export default DataGridComponent
