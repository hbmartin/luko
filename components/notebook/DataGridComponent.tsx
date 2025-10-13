"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type CellMouseArgs,
  type CellSelectArgs,
  Column,
  type RenderGroupCellProps,
  renderToggleGroup,
  textEditor,
  TreeDataGrid,
} from "react-data-grid"
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
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(
    () => new Set<unknown>(notebook.categories.map((category) => category.id))
  )
  const previousNotebookIdRef = useRef(notebook.id)
  useEffect(() => {
    if (previousNotebookIdRef.current !== notebook.id) {
      previousNotebookIdRef.current = notebook.id
      setExpandedGroupIds(new Set<unknown>(notebook.categories.map((category) => category.id)))
    }
  }, [notebook.categories, notebook.id])
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])
  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>()
    notebook.categories.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [notebook.categories])
  const columns = useMemo<Column<GridRow>[]>(() => {
    const numericCellClass = "spreadsheet-cell-numeric"
    const unitCellClass = "spreadsheet-cell-unit"

    const groupColumn: Column<GridRow> = {
      key: "categoryId",
      name: "",
      width: 280,
      frozen: true,
      renderGroupCell: (props: RenderGroupCellProps<GridRow>) => {
        const rawKey = props.groupKey == null ? "" : String(props.groupKey)
        const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"
        return renderToggleGroup({
          ...props,
          groupKey: label,
        })
      },
    }

    const baseColumns: Column<GridRow>[] = [
      {
        key: "name",
        name: "Metric",
        width: 320,
        frozen: true,
        cellClass: "spreadsheet-cell-name",
        renderCell: ({ row }) => {
          return (
            <div className="spreadsheet-metric">
              <div>
                <p className="spreadsheet-metric-name">{row.name}</p>
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

    return [groupColumn, ...baseColumns]
  }, [categoryLabels, onCategoryToggle, onMetricChange, validationErrors])

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
    <div className="min-h-0 min-w-0 flex-1">
      <TreeDataGrid
        className="rdg-light rdg-spreadsheet w-full"
        style={{ height: "100%", width: "100%" }}
        columns={columns}
        rows={rows}
        rowHeight={density === "compact" ? 36 : 46}
        rowKeyGetter={(row) => row.id}
        rowClass={(row) => rowClass?.(row) ?? ""}
        defaultColumnOptions={{ resizable: false }}
        onCellClick={handleCellClick}
        onSelectedCellChange={handleCellFocus}
        groupBy={["categoryId"]}
        rowGrouper={rowGrouper}
        expandedGroupIds={expandedGroupIds}
        onExpandedGroupIdsChange={setExpandedGroupIds}
      />
    </div>
  )
}
function rowGrouper(rows: readonly GridRow[], columnKey: string) {
  return rows.reduce<Record<string, GridRow[]>>((groups, row) => {
    const rawKey = (row as Record<string, unknown>)[columnKey]
    const key = rawKey == null ? "__ungrouped__" : String(rawKey)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key]!.push(row)
    return groups
  }, {})
}

export default DataGridComponent
