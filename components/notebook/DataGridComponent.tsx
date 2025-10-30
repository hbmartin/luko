"use client"

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import type { CategoryRow, FormulaToken, GridRow, MetricRow, Notebook } from "@/lib/types/notebook"
import { notebookToGridRows } from "@/lib/utils/grid-helpers"
import { FormulaRowCell } from "./FormulaRowCell"
import { Button } from "../ui/button"

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
  onFormulaChange: (formulaId: string, tokens: FormulaToken[]) => void
  formulaValidation: Record<string, string | undefined>
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
  onOpenDetails,
  onAddMetric,
  onDeleteMetric,
  onAddCategory,
  onDeleteCategory,
  onFormulaChange,
  formulaValidation,
  onAddFormula,
  onDeleteFormula,
}: DataGridComponentProps) {
  const gridRef = useRef<DataGridHandle>(null)
  useLayoutEffect(() => {
    const el = gridRef.current?.element // DataGridHandle gives you { element }
    if (!el) return
    el.dataset.instance = el.dataset.instance ?? Math.random().toString(36).slice(2)
    console.log("grid instance", el.dataset.instance)
    const cells = document.getElementsByClassName("rdg-cell")
    for (let i = 0; i < cells.length; i++) {
      const height = cells[i]?.getBoundingClientRect().height
      if (height !== 46) {
        console.error("cell height is not 46", cells[i])
      }
    }
  })
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
        // renderEditCell: textEditor,
        // renderCell: ({ row }) => {
        //   return (
        //     <div className="spreadsheet-metric">
        //       <div>
        //         <p className="spreadsheet-metric-name">{row.name}</p>
        //       </div>
        //     </div>
        //   )
        // },
        // renderGroupCell: ({ groupKey }: RenderGroupCellProps<GridRow>) => {
        //   const rawKey = groupKey == null ? "" : String(groupKey)
        //   const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"

        //   return (
        //     <Button variant="outline" onClick={(event) => handleGroupMenuButtonClick(rawKey, label, event)}>
        //       Add new...
        //     </Button>
        //   )
        // },
      },
      {
        key: "unit",
        name: "Unit",
        width: 120,
        cellClass: unitCellClass,
        // colSpan: (args) => {
        //   if (args.type !== "ROW") return undefined
        //   if (args.row.type === "formula") return 4
        //   return 1
        // },
        // renderCell: ({ row, column, onRowChange, rowIdx }: RenderCellProps<GridRow>) => {
        // if (isFormulaRow(row)) {
        //   return (
        //     <FormulaRowCell
        //       formula={row}
        //       metrics={notebook.metrics}
        //       isActive={activeFormulaId === row.id}
        //       onActivate={() => setActiveFormulaId(row.id)}
        //       onTokensChange={(tokens) => onFormulaChange(row.id, tokens)}
        //       onHighlightMetric={setHighlightedMetricId}
        //       validationMessage={formulaValidation[row.id] ?? null}
        //     />
        //   )
        // }
        //   return textEditor({ row, column, onRowChange, rowIdx, onClose: () => {} })
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

    return [groupColumn, ...baseColumns]
  }, [
    categoryLabels,
    handleGroupContextMenu,
    handleGroupMenuButtonClick,
    notebook.metrics,
    activeFormulaId,
    onFormulaChange,
    formulaValidation,
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
      onFormulaChange(activeFormulaId, [...formula.tokens, { type: "metric", metricId }])
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
      console.log("rows changed")
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

  useEffect(() => {
    console.log("density changed to", density)
  }, [density])

  useLayoutEffect(() => {
    const grid = gridRef.current?.element
    if (!grid) return

    const dumpRows = () => {
      const rows = Array.from(grid.querySelectorAll<HTMLElement>('.rdg [role="row"]'))
      const data = rows
        .map((row) => ({
          ariaRow: Number(row.getAttribute("aria-rowindex")),
          gridRowStart: Number(row.style.getPropertyValue("--rdg-grid-row-start") || Number.NaN),
        }))
        .filter((row) => !Number.isNaN(row.gridRowStart))

      if (data.length === 0) return
      const starts = data.map((row) => row.gridRowStart)
      console.log("row range", Math.min(...starts), Math.max(...starts), "rows rendered", data.length)
    }

    dumpRows()
    const intervalId = window.setInterval(dumpRows, 200)

    const originalDescriptor = Object.getOwnPropertyDescriptor(grid, "scrollTop")
    if (!originalDescriptor) {
      const proto = Object.getPrototypeOf(grid)
      const descriptorFromProto = Object.getOwnPropertyDescriptor(proto, "scrollTop")
      if (descriptorFromProto?.get && descriptorFromProto?.set) {
        Object.defineProperty(grid, "scrollTop", {
          configurable: true,
          get() {
            return descriptorFromProto.get!.call(this)
          },
          set(value: number) {
            console.trace("scrollTop set", value)
            descriptorFromProto.set!.call(this, value)
          },
        })
      }
    } else if (originalDescriptor.get && originalDescriptor.set) {
      Object.defineProperty(grid, "scrollTop", {
        configurable: true,
        get() {
          return originalDescriptor.get!.call(this)
        },
        set(value: number) {
          console.trace("scrollTop set", value)
          originalDescriptor.set!.call(this, value)
        },
      })
    }

    return () => {
      window.clearInterval(intervalId)
      delete (grid as typeof grid & { scrollTop?: number }).scrollTop
    }
  }, [])
  /* <ContextMenu onOpenChange={handleContextMenuOpenChange}>
      <ContextMenuTrigger asChild> */
  return (
    <TreeDataGrid
      enableVirtualization={true}
      ref={gridRef}
      className="rdg-light rdg-spreadsheet h-screen"
      columns={columns}
      rows={rows}
      style={{ minHeight: 0 }}
      rowHeight={46}
      headerRowHeight={46}
      rowKeyGetter={(row) => row.id}
      rowClass={(row) => rowClass?.(row) ?? ""}
      defaultColumnOptions={{ resizable: false }}
      // onCellClick={handleCellClick}
      // onSelectedCellChange={handleCellFocus}
      // onCellContextMenu={handleCellContextMenu}
      groupBy={["categoryId"]}
      rowGrouper={rowGrouper}
      expandedGroupIds={expandedGroupIds}
      onExpandedGroupIdsChange={setExpandedGroupIds}
      // onRowsChange={handleRowsChange}
      onScroll={(event: React.UIEvent<HTMLDivElement>) => {
        const starts = [...document.querySelectorAll('.rdg-cell[aria-colindex="1"]')].map((cell) =>
          Number(getComputedStyle(cell).gridRowStart)
        )
        const heights = [...document.querySelectorAll('.rdg-cell[aria-colindex="1"]')].map(
          (cell) => cell.getBoundingClientRect().height
        )
        console.log(Math.min(...starts), Math.max(...starts), Math.min(...heights), Math.max(...heights))
        const el = gridRef.current?.element // DataGridHandle gives you { element }
        if (!el) return
        const cells = document.getElementsByClassName("rdg-cell")
        for (let i = 0; i < cells.length; i++) {
          const height = cells[i]?.getBoundingClientRect().height
          if (height !== 46) {
            console.error("cell height is not 46", cells[i]?.getBoundingClientRect().height)
          }
        }
        const grid = event.currentTarget
        console.log("scroll", grid.scrollTop, grid.clientHeight, grid.scrollHeight)
      }}
    />
    // </ContextMenuTrigger>
    //   {contextMenuState && (
    //     <ContextMenuContent>
    //       {contextMenuState.kind === "metric" && (
    //         <>
    //           <ContextMenuLabel inset>{contextMenuState.metricName}</ContextMenuLabel>
    //           <ContextMenuSeparator />
    //           <ContextMenuItem
    //             variant="destructive"
    //             onSelect={() => {
    //               onDeleteMetric?.(contextMenuState.metricId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Delete metric
    //           </ContextMenuItem>
    //           <ContextMenuItem
    //             onSelect={() => {
    //               onAddMetric?.(contextMenuState.categoryId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Add new metric
    //           </ContextMenuItem>
    //         </>
    //       )}
    //       {contextMenuState.kind === "category" && (
    //         <>
    //           <ContextMenuLabel inset>{contextMenuState.categoryName}</ContextMenuLabel>
    //           <ContextMenuSeparator />
    //           <ContextMenuItem
    //             variant="destructive"
    //             onSelect={() => {
    //               onDeleteCategory?.(contextMenuState.categoryId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Delete category
    //           </ContextMenuItem>
    //           <ContextMenuItem
    //             onSelect={() => {
    //               onAddCategory?.(contextMenuState.categoryId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Add new category
    //           </ContextMenuItem>
    //           <ContextMenuSeparator />
    //           <ContextMenuItem
    //             onSelect={() => {
    //               const newId = onAddFormula?.(contextMenuState.categoryId)
    //               if (newId) setActiveFormulaId(newId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Add formula row
    //           </ContextMenuItem>
    //           <ContextMenuItem
    //             onSelect={() => {
    //               onAddMetric?.(contextMenuState.categoryId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Add new metric
    //           </ContextMenuItem>
    //         </>
    //       )}
    //       {contextMenuState.kind === "formula" && (
    //         <>
    //           <ContextMenuLabel inset>{contextMenuState.formulaName}</ContextMenuLabel>
    //           <ContextMenuSeparator />
    //           <ContextMenuItem
    //             variant="destructive"
    //             onSelect={() => {
    //               onDeleteFormula?.(contextMenuState.formulaId)
    //               setContextMenuState(null)
    //             }}
    //           >
    //             Delete formula
    //           </ContextMenuItem>
    //         </>
    //       )}
    //     </ContextMenuContent>
    //   )}
    // </ContextMenu>
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
