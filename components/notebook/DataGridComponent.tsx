"use client"

import {
  cloneElement,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type CellMouseArgs,
  type CellMouseEvent,
  type CellSelectArgs,
  Column,
  type DataGridHandle,
  RenderCellProps,
  RenderEditCellProps,
  type RenderGroupCellProps,
  renderToggleGroup,
  renderValue,
  type RowsChangeData,
  textEditor,
  TreeDataGrid,
} from "react-data-grid"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { parseNumeric } from "@/lib/math-utils"
import type { CategoryRow, GridRow, MetricRow, Notebook } from "@/lib/types/notebook"
import { notebookToGridRows } from "@/lib/utils/grid-helpers"

// GroupRow type from react-data-grid (not exported)
interface GroupRow<TRow> {
  readonly childRows: readonly TRow[]
  readonly id: string
  readonly parentId: unknown
  readonly groupKey: unknown
  readonly isExpanded: boolean
  readonly level: number
  readonly posInSet: number
  readonly setSize: number
  readonly startRowIndex: number
}

interface DataGridComponentProps {
  notebook: Notebook
  density: "comfortable" | "compact"
  onMetricChange: (metricId: string, field: "min" | "mode" | "max" | "value", value: number) => void
  onCategoryToggle: (categoryId: string) => void
  onRowReorder: (sourceId: string, targetId: string) => void
  onOpenDetails: (metricId: string) => void
  onAddMetric?: (categoryId: string) => void
  onDeleteMetric?: (metricId: string) => void
  onMetricRename?: (metricId: string, name: string) => void
  onAddCategory?: (categoryId: string) => void
  onDeleteCategory?: (categoryId: string) => void
  onFormulaChange: (formulaId: string, expression: string) => void
  onFormulaRename?: (formulaId: string, name: string) => void
  onAddFormula?: (categoryId: string) => string | void
  onDeleteFormula?: (formulaId: string) => void
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
  | {
      kind: "formula"
      formulaId: string
      formulaName: string
      categoryId: string
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

function isFormulaRow(row: GridRow): row is Extract<GridRow, { type: "formula" }> {
  return row.type === "formula"
}

export function DataGridComponent({
  notebook,
  density,
  onMetricChange,
  onMetricRename,
  onOpenDetails,
  onAddMetric,
  onDeleteMetric,
  onAddCategory,
  onDeleteCategory,
  onFormulaChange,
  onFormulaRename,
  onAddFormula,
  onDeleteFormula,
}: DataGridComponentProps) {
  const gridRef = useRef<DataGridHandle>(null)
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(
    () => new Set<unknown>(notebook.categories.map((category) => category.id))
  )
  const [contextMenuState, setContextMenuState] = useState<GridContextMenuState | null>(null)
  const [activeFormulaId, setActiveFormulaId] = useState<string | null>(null)
  const [highlightedMetricId, setHighlightedMetricId] = useState<string | null>(null)
  const previousNotebookIdRef = useRef(notebook.id)
  const hasPositionedInitialCellRef = useRef(false)
  useEffect(() => {
    if (previousNotebookIdRef.current !== notebook.id) {
      previousNotebookIdRef.current = notebook.id
      setExpandedGroupIds(new Set<unknown>(notebook.categories.map((category) => category.id)))
      hasPositionedInitialCellRef.current = false
    }
  }, [notebook.categories, notebook.id])
  useEffect(() => {
    setContextMenuState(null)
  }, [notebook.id])
  useEffect(() => {
    if (!activeFormulaId) return
    const exists = notebook.formulas.some((formula) => formula.id === activeFormulaId)
    if (!exists) {
      setActiveFormulaId(null)
    }
  }, [activeFormulaId, notebook.formulas])
  useEffect(() => {
    if (!highlightedMetricId) return
    const exists = notebook.metrics.some((metric) => metric.id === highlightedMetricId)
    if (!exists) {
      setHighlightedMetricId(null)
    }
  }, [highlightedMetricId, notebook.metrics])
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])
  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>()
    notebook.categories.forEach((category) => {
      map.set(category.id, category.name)
    })
    return map
  }, [notebook.categories])
  const openCategoryContextMenu = useCallback(
    (categoryId: string, categoryName: string) => {
      setContextMenuState({
        kind: "category",
        categoryId,
        categoryName,
      })
    },
    [setContextMenuState]
  )
  const handleGroupContextMenu = useCallback(
    (categoryId: string, categoryName: string, event: ReactMouseEvent) => {
      if (!categoryId || categoryId === "__ungrouped__") return
      event.preventDefault()
      openCategoryContextMenu(categoryId, categoryName)
    },
    [openCategoryContextMenu]
  )
  const handleGroupMenuButtonClick = useCallback(
    (categoryId: string, categoryName: string, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!categoryId || categoryId === "__ungrouped__") return

      event.preventDefault()
      event.stopPropagation()

      openCategoryContextMenu(categoryId, categoryName)

      const { clientX, clientY } = event.nativeEvent
      const rect = event.currentTarget.getBoundingClientRect()
      const pointerX = clientX || rect.left + rect.width / 2
      const pointerY = clientY || rect.top + rect.height / 2

      event.currentTarget.dispatchEvent(
        new MouseEvent("contextmenu", {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: pointerX,
          clientY: pointerY,
        })
      )
    },
    [openCategoryContextMenu]
  )

  const safeTextEditor = useCallback((props: RenderEditCellProps<GridRow>) => {
    const rowWithIndex = props.row as GridRow & { [key: string]: unknown }
    const rawValue = rowWithIndex[props.column.key]
    const normalizedValue = rawValue == null ? "" : String(rawValue)

    return textEditor({ ...props, row: { ...props.row, [props.column.key]: normalizedValue } })
  }, [])

  const columns = useMemo<Column<GridRow>[]>(() => {
    const numericCellClass = "spreadsheet-cell-numeric"
    const unitCellClass = "spreadsheet-cell-unit"

    const groupColumn: Column<GridRow> = {
      key: "categoryId",
      name: "",
      width: 280,
      frozen: true,
      renderCell: ({ row }: RenderCellProps<GridRow>) => {
        if ("error" in row && row.error) {
          return <div className="text-red-500">{row.error}</div>
        }
        return null
      },
      renderGroupCell: (props: RenderGroupCellProps<GridRow>) => {
        const rawKey = props.groupKey == null ? "" : String(props.groupKey)
        const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"
        if (rawKey === "__ungrouped__" || rawKey === "") {
          return renderToggleGroup({
            ...props,
            groupKey: label,
          })
        }
        return (
          <div
            className="flex w-full items-center justify-between gap-2 pr-2"
            onContextMenu={(event) => handleGroupContextMenu(rawKey, label, event)}
          >
            <div className="min-w-0 flex-1">
              {renderToggleGroup({
                ...props,
                groupKey: label,
              })}
            </div>
          </div>
        )
      },
    }

    const baseColumns: Column<GridRow>[] = [
      {
        key: "name",
        name: "Lever",
        width: 320,
        frozen: true,
        cellClass: "spreadsheet-cell-name",
        renderEditCell: safeTextEditor,
        renderCell: ({ row }) => {
          return (
            <div className="spreadsheet-metric">
              <div>
                <p className="spreadsheet-metric-name">{row.name}</p>
              </div>
            </div>
          )
        },
        renderGroupCell: ({ groupKey }: RenderGroupCellProps<GridRow>) => {
          const rawKey = groupKey == null ? "" : String(groupKey)
          const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"

          return (
            <Button variant="outline" onClick={(event) => handleGroupMenuButtonClick(rawKey, label, event)}>
              Add new...
            </Button>
          )
        },
      },
      {
        key: "unit",
        name: "Unit",
        width: 120,
        cellClass: unitCellClass,
        colSpan: (args) => {
          if (args.type !== "ROW") return undefined
          if (args.row.type === "formula") return 4
          return 1
        },
        renderCell: ({ row, column, onRowChange, rowIdx, tabIndex }: RenderCellProps<GridRow>) => {
          if (isFormulaRow(row)) {
            return String(row.expression)
          }
          return renderValue({ row, column, onRowChange, rowIdx, tabIndex, isCellEditable: true })
        },
        renderEditCell: ({ row, column, onRowChange, rowIdx, onClose }: RenderEditCellProps<GridRow>) => {
          if (isFormulaRow(row)) {
            return String(row.expression)
          }
          return safeTextEditor({ row, column, onRowChange, rowIdx, onClose })
        },
      },
      {
        key: "min",
        name: "Min",
        width: 120,
        cellClass: numericCellClass,
        renderEditCell: safeTextEditor,
      },
      {
        key: "mode",
        name: "Most Likely",
        width: 140,
        cellClass: numericCellClass,
        renderEditCell: safeTextEditor,
      },
      {
        key: "max",
        name: "Max",
        width: 120,
        cellClass: numericCellClass,
        renderEditCell: safeTextEditor,
      },
    ]

    return [groupColumn, ...baseColumns]
  }, [
    categoryLabels,
    handleGroupContextMenu,
    handleGroupMenuButtonClick,
    notebook.metrics,
    activeFormulaId,
    onFormulaChange,
    safeTextEditor,
  ])

  const rowClass = useCallback(
    (row: GridRow) => {
      const classes = ["spreadsheet-row"]
      if (row.type === "category") classes.push("spreadsheet-row-category")
      if (row.type === "metric" && row.isDirty) classes.push("spreadsheet-row-dirty")
      if (row.type === "metric" && highlightedMetricId && row.id === highlightedMetricId) {
        classes.push("spreadsheet-row-highlight")
      }
      return classes.join(" ")
    },
    [highlightedMetricId]
  )

  const lastDetailsTriggerRef = useRef<{ id: string; time: number } | null>(null)

  const triggerDetails = useCallback(
    (rowId: string) => {
      console.log("triggering details for", rowId)
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

  const addMetricToActiveFormula = useCallback(
    (metricId: string) => {
      if (!activeFormulaId) return false
      const formula = notebook.formulas.find((candidate) => candidate.id === activeFormulaId)
      if (!formula) return false
      // const existingTokens = expressionToTokens(formula.expression)
      // const nextTokens: ExpressionToken[] = [...existingTokens, { type: "metric", metricId }]
      // onFormulaChange(activeFormulaId, tokensToExpression(nextTokens))
      setHighlightedMetricId(metricId)
      return true
    },
    [activeFormulaId, notebook.formulas, onFormulaChange]
  )

  const handleFormulaRowSelection = useCallback(
    (row: Extract<GridRow, { type: "formula" }>) => {
      console.log("formula row selected", row)
      setActiveFormulaId(row.id)
      triggerDetails(row.id)
    },
    [triggerDetails]
  )

  const handleMetricRowSelection = useCallback(
    (row: MetricRow) => {
      console.log("metric row selected", row)
      addMetricToActiveFormula(row.id)
      triggerDetails(row.id)
    },
    [addMetricToActiveFormula, triggerDetails]
  )

  const handleCellClick = useCallback(
    ({ row }: CellMouseArgs<GridRow>) => {
      console.log("cell clicked", row)
      if (isMetricRow(row)) {
        handleMetricRowSelection(row)
        return
      }
      if (isFormulaRow(row)) {
        handleFormulaRowSelection(row)
      }
    },
    [handleFormulaRowSelection, handleMetricRowSelection]
  )

  const handleCellFocus = useCallback(
    ({ row }: CellSelectArgs<GridRow>) => {
      console.log("cell focused", row)
      if (!row) return
      if (isFormulaRow(row)) {
        handleFormulaRowSelection(row)
        return
      }
      if (isMetricRow(row)) {
        triggerDetails(row.id)
      }
    },
    [handleFormulaRowSelection, triggerDetails]
  )

  const handleRowsChange = useCallback(
    (updatedRows: readonly GridRow[], data: RowsChangeData<GridRow>) => {
      console.log("rows changed data", data)
      console.log("rows changed updatedRows", updatedRows)
      const columnKey = data.column?.key

      data.indexes.forEach((rowIndex) => {
        const row = updatedRows[rowIndex]
        if (!row || !columnKey) return

        if (isMetricRow(row)) {
          if (columnKey === "name") {
            onMetricRename?.(row.id, typeof row.name === "string" ? row.name : "")
            return
          }
          if (columnKey !== "min" && columnKey !== "mode" && columnKey !== "max" && columnKey !== "value") {
            return
          }

          let rawValue: unknown
          if (columnKey === "value") {
            rawValue = (row as typeof row & { value?: unknown }).value
          } else {
            rawValue = row[columnKey]
          }
          const parsedValue = parseNumeric(rawValue)

          onMetricChange(row.id, columnKey, parsedValue)
          return
        }

        if (isFormulaRow(row) && columnKey === "name") {
          onFormulaRename?.(row.id, typeof row.name === "string" ? row.name : "")
        }
      })
    },
    [onFormulaRename, onMetricChange, onMetricRename]
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
    ({ row }: CellMouseArgs<GridRow>, event: CellMouseEvent) => {
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
      } else if (isFormulaRow(row)) {
        nextState = {
          kind: "formula",
          formulaId: row.id,
          formulaName: row.name,
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
        <div className="h-screen">
          <TreeDataGrid
            ref={gridRef}
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
                  const newId = onAddFormula?.(contextMenuState.categoryId)
                  if (newId) setActiveFormulaId(newId)
                  setContextMenuState(null)
                }}
              >
                Add formula row
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
          {contextMenuState.kind === "formula" && (
            <>
              <ContextMenuLabel inset>{contextMenuState.formulaName}</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onSelect={() => {
                  onDeleteFormula?.(contextMenuState.formulaId)
                  setContextMenuState(null)
                }}
              >
                Delete formula
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
    const rawKey = (row as unknown as Record<string, unknown>)[columnKey]
    const key = rawKey == null ? "__ungrouped__" : String(rawKey)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key]!.push(row)
    return groups
  }, {})
}

export default DataGridComponent
