"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type CellMouseArgs,
  type CellSelectArgs,
  Column,
  type GroupRow,
  type RenderGroupCellProps,
  renderToggleGroup,
  type RowsChangeData,
  textEditor,
  TreeDataGrid,
} from "react-data-grid"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { CategoryRow, GridRow, MetricRow, Notebook } from "@/lib/types/notebook"
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
  onAddMetric?: (categoryId: string) => void
  onDeleteMetric?: (metricId: string) => void
  onAddCategory?: (categoryId: string) => void
  onDeleteCategory?: (categoryId: string) => void
}

type GridContextMenuState =
  | {
      kind: "metric"
      metricId: string
      metricName: string
      categoryId: string
    }
  | {
      kind: "category"
      categoryId: string
      categoryName: string
    }

function isMetricRow(row: GridRow): row is MetricRow {
  return row.type === "metric"
}

function isCategoryRow(row: GridRow): row is CategoryRow {
  return row.type === "category"
}

function isGroupRowCandidate(row: unknown): row is GroupRow<GridRow> {
  return typeof row === "object" && row !== null && "groupKey" in row && "childRows" in row
}

export function DataGridComponent({
  notebook,
  density,
  validationErrors,
  onMetricChange,
  onCategoryToggle,
  onOpenDetails,
  onAddMetric,
  onDeleteMetric,
  onAddCategory,
  onDeleteCategory,
}: DataGridComponentProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(
    () => new Set<unknown>(notebook.categories.map((category) => category.id))
  )
  const [contextMenuState, setContextMenuState] = useState<GridContextMenuState | null>(null)
  const previousNotebookIdRef = useRef(notebook.id)
  useEffect(() => {
    if (previousNotebookIdRef.current !== notebook.id) {
      previousNotebookIdRef.current = notebook.id
      setExpandedGroupIds(new Set<unknown>(notebook.categories.map((category) => category.id)))
    }
  }, [notebook.categories, notebook.id])
  useEffect(() => {
    setContextMenuState(null)
  }, [notebook.id])
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

  const handleRowsChange = useCallback(
    (updatedRows: readonly GridRow[], data: RowsChangeData<GridRow>) => {
      const columnKey = data.column?.key
      if (columnKey !== "min" && columnKey !== "mode" && columnKey !== "max" && columnKey !== "value") return

      const parseNumeric = (value: unknown): number => {
        if (typeof value === "number") return value
        if (typeof value === "string") {
          const trimmed = value.trim()
          if (trimmed === "") return Number.NaN
          const sanitized = trimmed.replace(/,/g, "")
          const parsed = Number(sanitized)
          return Number.isFinite(parsed) ? parsed : Number.NaN
        }
        return Number.NaN
      }

      data.indexes.forEach((rowIndex) => {
        const row = updatedRows[rowIndex]
        if (!row || row.type !== "metric") return

        let rawValue: unknown
        if (columnKey === "value") {
          rawValue = (row as typeof row & { value?: unknown }).value
        } else {
          rawValue = row[columnKey]
        }
        const parsedValue = parseNumeric(rawValue)

        onMetricChange(row.id, columnKey, parsedValue)
      })
    },
    [onMetricChange]
  )

  const handleContextMenuOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setContextMenuState(null)
      }
    },
    [setContextMenuState]
  )

  const handleCellContextMenu = useCallback(
    ({ row }: CellMouseArgs<GridRow>, event) => {
      event.preventGridDefault?.()
      event.preventDefault()

      let nextState: GridContextMenuState | null = null

      if (isMetricRow(row)) {
        nextState = {
          kind: "metric",
          metricId: row.id,
          metricName: row.name,
          categoryId: row.categoryId,
        }
      } else if (isCategoryRow(row)) {
        const label = categoryLabels.get(row.id) ?? row.name
        nextState = {
          kind: "category",
          categoryId: row.id,
          categoryName: label,
        }
      } else {
        const candidate = row as unknown
        if (isGroupRowCandidate(candidate)) {
          const rawKey = candidate.groupKey
          if (typeof rawKey === "string" && rawKey !== "__ungrouped__") {
            const categoryName = categoryLabels.get(rawKey) ?? rawKey
            nextState = {
              kind: "category",
              categoryId: rawKey,
              categoryName,
            }
          }
        }
      }

      if (!nextState) {
        event.stopPropagation()
        setContextMenuState(null)
        return
      }

      setContextMenuState(nextState)
    },
    [categoryLabels]
  )

  return (
    <ContextMenu onOpenChange={handleContextMenuOpenChange}>
      <ContextMenuTrigger asChild>
        <div className="h-full">
          <TreeDataGrid
            className="rdg-light rdg-spreadsheet"
            columns={columns}
            rows={rows}
            style={{ height: "100%" }}
            rowHeight={density === "compact" ? 36 : 46}
            rowKeyGetter={(row) => row.id}
            rowClass={(row) => rowClass?.(row) ?? ""}
            defaultColumnOptions={{ resizable: false }}
            onCellClick={handleCellClick}
            onSelectedCellChange={handleCellFocus}
            onCellContextMenu={handleCellContextMenu}
            groupBy={["categoryId"]}
            rowGrouper={rowGrouper}
            expandedGroupIds={expandedGroupIds}
            onExpandedGroupIdsChange={setExpandedGroupIds}
            onRowsChange={handleRowsChange}
          />
        </div>
      </ContextMenuTrigger>
      {contextMenuState && (
        <ContextMenuContent>
          {contextMenuState.kind === "metric" && (
            <>
              <ContextMenuLabel inset>{contextMenuState.metricName}</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onSelect={() => {
                  onDeleteMetric?.(contextMenuState.metricId)
                  setContextMenuState(null)
                }}
              >
                Delete metric
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  onAddMetric?.(contextMenuState.categoryId)
                  setContextMenuState(null)
                }}
              >
                Add new metric
              </ContextMenuItem>
            </>
          )}
          {contextMenuState.kind === "category" && (
            <>
              <ContextMenuLabel inset>{contextMenuState.categoryName}</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onSelect={() => {
                  onDeleteCategory?.(contextMenuState.categoryId)
                  setContextMenuState(null)
                }}
              >
                Delete category
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() => {
                  onAddCategory?.(contextMenuState.categoryId)
                  setContextMenuState(null)
                }}
              >
                Add new category
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => {
                  onAddMetric?.(contextMenuState.categoryId)
                  setContextMenuState(null)
                }}
              >
                Add new metric
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
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
