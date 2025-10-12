"use client"

import { useCallback, useMemo, useRef } from "react"
import { type CellMouseArgs, type CellSelectArgs, Column, DataGrid, textEditor } from "react-data-grid"
import type { GridRow, Notebook } from "@/lib/types/notebook"
import { formatCurrency, formatNumber, notebookToGridRows } from "@/lib/utils/grid-helpers"

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
  onOpenDetails,
  onContextRequest,
}: DataGridComponentProps) {
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])
  const columns = useMemo<Column<GridRow>[]>(() => {
    const numericCellClass = "spreadsheet-cell-numeric"
    const unitCellClass = "spreadsheet-cell-unit"

    // const renderDistributionInput = (row: GridRow, field: "min" | "max") => {
    //   if (row.type === "category") return null

    //   if (row.value !== null) {
    //     return <span className="spreadsheet-fixed-value">{formatNumber(row.value, 2)}</span>
    //   }

    //   const error = validationErrors[row.id]?.[field]
    //   const defaultValue = row[field] ?? ""

    //   return (
    //     <input
    //       type="number"
    //       key={`${row.id}-${field}-${defaultValue}`}
    //       defaultValue={defaultValue}
    //       onBlur={(event) => {
    //         const nextValue = Number.parseFloat(event.currentTarget.value)
    //         if (!Number.isNaN(nextValue)) {
    //           onMetricChange(row.id, field, nextValue)
    //         }
    //       }}
    //       data-validation={error ? "error" : undefined}
    //       aria-invalid={Boolean(error)}
    //       aria-describedby={error ? `${row.id}-${field}-error` : undefined}
    //       className="spreadsheet-input"
    //     />
    //   )
    // }

    // const renderModeInput = (row: GridRow) => {
    //   if (row.type === "category") return null

    //   const error = validationErrors[row.id]?.mode
    //   const isFixed = row.value !== null
    //   const defaultValue = (isFixed ? row.value : row.mode) ?? ""

    //   return (
    //     <input
    //       type="number"
    //       key={`${row.id}-mode-${defaultValue}`}
    //       defaultValue={defaultValue}
    //       onBlur={(event) => {
    //         const nextValue = Number.parseFloat(event.currentTarget.value)
    //         if (!Number.isNaN(nextValue)) {
    //           onMetricChange(row.id, isFixed ? "value" : "mode", nextValue)
    //         }
    //       }}
    //       data-validation={error ? "error" : undefined}
    //       aria-invalid={Boolean(error)}
    //       aria-describedby={error ? `${row.id}-mode-error` : undefined}
    //       className="spreadsheet-input"
    //     />
    //   )
    // }

    const baseColumns: Column<GridRow>[] = [
      {
        key: "name",
        name: "Metric",
        width: 320,
        frozen: true,
        cellClass: "spreadsheet-cell-name",
        renderCell: ({ row }) => {
          if (row.type === "category") {
            return (
              <div className="spreadsheet-category">
                <div className="spreadsheet-category-main">
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
        // renderCell: ({ row }) => {
        //   if (row.type === "category" || !row.unit) return null
        //   return <span className="spreadsheet-unit">{row.unit}</span>
        // },
      },
      {
        key: "min",
        name: "Min",
        width: 120,
        cellClass: numericCellClass,
        renderEditCell: textEditor,
      },
      {
        key: "mode",
        name: "Most Likely",
        width: 140,
        cellClass: numericCellClass,
        renderEditCell: textEditor,
      },
      {
        key: "max",
        name: "Max",
        width: 120,
        cellClass: numericCellClass,
        renderEditCell: textEditor,
      },
    ]

    baseColumns[0].colSpan = (args) => {
      if (args.type !== "ROW") return undefined
      return args.row.type === "category" ? baseColumns.length : undefined
    }

    return baseColumns
  }, [onCategoryToggle, onMetricChange, validationErrors])
  const rowClass = useCallback((row: GridRow) => {
    const classes = ["spreadsheet-row"]
    if (row.type === "category") classes.push("spreadsheet-row-category")
    if (row.type === "metric" && row.isDirty) classes.push("spreadsheet-row-dirty")
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
    <div className="h-full min-h-0 min-w-0 flex-1">
      <DataGrid
        className="rdg-light rdg-spreadsheet h-full w-full"
        style={{ height: "100%", width: "100%" }}
        columns={columns}
        rows={rows}
        rowHeight={density === "compact" ? 36 : 46}
        rowKeyGetter={(row) => row.id}
        rowClass={(row) => rowClass?.(row) ?? ""}
        // renderers={{
        //   renderRow: (key, props) => <RowRenderer key={key} {...props} />,
        // }}
        defaultColumnOptions={{ resizable: true }}
        onCellClick={handleCellClick}
        onSelectedCellChange={handleCellFocus}
      />
    </div>
  )
}

export default DataGridComponent
