"use client"

import { memo, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type CellMouseArgs,
  type CellMouseEvent,
  type CellSelectArgs,
  type Column,
  type DataGridHandle,
  type RenderCellProps,
  type RenderEditCellProps,
  type RenderGroupCellProps,
  renderTextEditor,
  renderValue,
  type RowsChangeData,
  ToggleGroup,
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
import { buildReferenceableIds, type ReferenceableNotebookItem } from "@/lib/utils/notebook-indices"
import { FormulaEditorSingleLine, type MetricMentionItem } from "./FormulaEditorSingleLine"

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

interface DataGridComponentProperties {
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

const gridStyle = { height: "100%" } as const
const defaultColumnOptions = { resizable: false } as const
const categoryGroupBy = ["categoryId"] as const
const getRowId = (row: GridRow) => row.id

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

const appendMetricReference = (expression: string, metricId: string) => {
  const trimmed = expression.trim()
  if (!trimmed) return metricId

  const canAppendDirectly = /[(*+,/-]\s*$/.test(trimmed)
  return canAppendDirectly ? `${trimmed} ${metricId}` : `${trimmed} + ${metricId}`
}

const rowGrouper = (rows: readonly GridRow[], columnKey: string) => {
  return rows.reduce<Record<string, GridRow[]>>((groups, row) => {
    const rawKey = (row as unknown as Record<string, unknown>)[columnKey]
    const key = rawKey == undefined ? "__ungrouped__" : String(rawKey)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(row)
    return groups
  }, {})
}

const UnitCell = memo(function UnitCell(properties: RenderCellProps<GridRow>) {
  if (isFormulaRow(properties.row)) {
    return null
  }

  return renderValue({
    ...properties,
    isCellEditable: true,
  })
})

interface FormulaUnitCellProperties extends RenderCellProps<GridRow> {
  mentionOptions: MetricMentionItem[]
  referenceableIds: ReadonlyMap<string, ReferenceableNotebookItem>
}

const FormulaUnitCell = memo(function FormulaUnitCell({
  mentionOptions,
  referenceableIds,
  ...properties
}: FormulaUnitCellProperties) {
  if (!isFormulaRow(properties.row)) {
    return <UnitCell {...properties} />
  }

  return (
    <FormulaEditorSingleLine
      formulaId={properties.row.id}
      expression={properties.row.expression}
      mentionOptions={mentionOptions}
      referenceableIds={referenceableIds}
    />
  )
})

interface GroupCellHeaderProperties {
  categoryId: string
  categoryName: string
  groupCellProperties: RenderGroupCellProps<GridRow>
  onContextMenu: (categoryId: string, categoryName: string, event: ReactMouseEvent) => void
}

const GroupCellHeader = memo(function GroupCellHeader({
  categoryId,
  categoryName,
  groupCellProperties,
  onContextMenu,
}: GroupCellHeaderProperties) {
  const handleContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      onContextMenu(categoryId, categoryName, event)
    },
    [categoryId, categoryName, onContextMenu]
  )

  return (
    <div className="flex w-full items-center justify-between gap-2 pr-2" onContextMenu={handleContextMenu}>
      <div className="min-w-0 flex-1">
        <ToggleGroup {...groupCellProperties} groupKey={categoryName} />
      </div>
    </div>
  )
})

interface GroupMenuButtonProperties {
  categoryId: string
  categoryName: string
  onClick: (categoryId: string, categoryName: string, event: ReactMouseEvent<HTMLButtonElement>) => void
}

const GroupMenuButton = memo(function GroupMenuButton({
  categoryId,
  categoryName,
  onClick,
}: GroupMenuButtonProperties) {
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick(categoryId, categoryName, event)
    },
    [categoryId, categoryName, onClick]
  )

  return (
    <Button variant="outline" onClick={handleClick}>
      Add row
    </Button>
  )
})

interface GridContextMenuProperties {
  state: GridContextMenuState | null
  onAddCategory?: (categoryId: string) => void
  onAddFormula?: (categoryId: string) => string | void
  onAddMetric?: (categoryId: string) => void
  onClose: () => void
  onDeleteCategory?: (categoryId: string) => void
  onDeleteFormula?: (formulaId: string) => void
  onDeleteMetric?: (metricId: string) => void
  onSetActiveFormulaId: (formulaId: string) => void
}

const GridContextMenu = memo(function GridContextMenu({
  state,
  onAddCategory,
  onAddFormula,
  onAddMetric,
  onClose,
  onDeleteCategory,
  onDeleteFormula,
  onDeleteMetric,
  onSetActiveFormulaId,
}: GridContextMenuProperties) {
  if (!state) return null

  return (
    <ContextMenuContent>
      {state.kind === "metric" && (
        <>
          <ContextMenuLabel inset>{state.metricName}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              onDeleteMetric?.(state.metricId)
              onClose()
            }}
          >
            Delete metric
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              onAddMetric?.(state.categoryId)
              onClose()
            }}
          >
            Add new metric
          </ContextMenuItem>
        </>
      )}
      {state.kind === "category" && (
        <>
          <ContextMenuLabel inset>{state.categoryName}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              onDeleteCategory?.(state.categoryId)
              onClose()
            }}
          >
            Delete category
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              onAddCategory?.(state.categoryId)
              onClose()
            }}
          >
            Add new category
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => {
              const newId = onAddFormula?.(state.categoryId)
              if (newId) onSetActiveFormulaId(newId)
              onClose()
            }}
          >
            Add formula row
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              onAddMetric?.(state.categoryId)
              onClose()
            }}
          >
            Add new metric
          </ContextMenuItem>
        </>
      )}
      {state.kind === "formula" && (
        <>
          <ContextMenuLabel inset>{state.formulaName}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => {
              onDeleteFormula?.(state.formulaId)
              onClose()
            }}
          >
            Delete formula
          </ContextMenuItem>
        </>
      )}
    </ContextMenuContent>
  )
})

export const DataGridComponent = memo(function DataGridComponent({
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
}: DataGridComponentProperties) {
  const gridReference = useRef<DataGridHandle>(null)
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(
    () => new Set<unknown>(notebook.categories.map((category) => category.id))
  )
  const [contextMenuState, setContextMenuState] = useState<GridContextMenuState | null>(null)
  const [activeFormulaId, setActiveFormulaId] = useState<string | null>(null)
  const [highlightedMetricId, setHighlightedMetricId] = useState<string | null>(null)
  const latestCategoriesReference = useRef(notebook.categories)
  latestCategoriesReference.current = notebook.categories

  useEffect(() => {
    setExpandedGroupIds(new Set<unknown>(latestCategoriesReference.current.map((category) => category.id)))
  }, [notebook.id])
  useEffect(() => {
    setContextMenuState(null)
  }, [notebook.id])
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])
  const mentionOptions = useMemo<MetricMentionItem[]>(() => {
    const metricsByCategoryId = new Map<string, Notebook["metrics"]>()
    for (const metric of notebook.metrics) {
      const categoryMetrics = metricsByCategoryId.get(metric.categoryId)
      if (categoryMetrics) {
        categoryMetrics.push(metric)
      } else {
        metricsByCategoryId.set(metric.categoryId, [metric])
      }
    }

    return notebook.categories
      .toSorted((a, b) => a.order - b.order)
      .flatMap((category) =>
        (metricsByCategoryId.get(category.id) ?? []).map<MetricMentionItem>((metric) => ({
          id: metric.id,
          display: metric.name,
          categoryId: category.id,
          categoryName: category.name,
          categoryType: category.type,
          unit: metric.unit,
          description: metric.description,
        }))
      )
  }, [notebook.categories, notebook.metrics])
  const referenceableIds = useMemo(
    () => buildReferenceableIds({ metrics: notebook.metrics, formulas: notebook.formulas }),
    [notebook.formulas, notebook.metrics]
  )
  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of notebook.categories) {
      map.set(category.id, category.name)
    }
    return map
  }, [notebook.categories])
  const formulasById = useMemo(
    () => new Map(notebook.formulas.map((formula) => [formula.id, formula])),
    [notebook.formulas]
  )
  const metricsById = useMemo(() => new Map(notebook.metrics.map((metric) => [metric.id, metric])), [notebook.metrics])
  const safeActiveFormulaId = activeFormulaId && formulasById.has(activeFormulaId) ? activeFormulaId : null
  const safeHighlightedMetricId =
    highlightedMetricId && metricsById.has(highlightedMetricId) ? highlightedMetricId : null
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
          // eslint-disable-next-line no-undef, unicorn/prefer-global-this
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

  const safeTextEditor = useCallback((properties: RenderEditCellProps<GridRow>) => {
    const rowWithIndex = properties.row as GridRow & {
      [key: string]: unknown
    }
    const rawValue = rowWithIndex[properties.column.key]
    const normalizedValue = rawValue == undefined ? "" : String(rawValue)

    return renderTextEditor({
      ...properties,
      row: { ...properties.row, [properties.column.key]: normalizedValue },
    })
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
      renderGroupCell: (properties: RenderGroupCellProps<GridRow>) => {
        const rawKey = properties.groupKey == undefined ? "" : String(properties.groupKey)
        const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"
        if (rawKey === "__ungrouped__" || rawKey === "") {
          return <ToggleGroup {...properties} groupKey={label} />
        }
        return (
          <GroupCellHeader
            categoryId={rawKey}
            categoryName={label}
            groupCellProperties={properties}
            onContextMenu={handleGroupContextMenu}
          />
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
          const rawKey = groupKey == undefined ? "" : String(groupKey)
          const label = categoryLabels.get(rawKey) ?? rawKey ?? "Uncategorized"

          return <GroupMenuButton categoryId={rawKey} categoryName={label} onClick={handleGroupMenuButtonClick} />
        },
      },
      {
        key: "unit",
        name: "Unit",
        width: 120,
        cellClass: unitCellClass,
        editable: (row) => !isFormulaRow(row),
        colSpan: (arguments_) => {
          if (arguments_.type !== "ROW") return
          if (arguments_.row.type === "formula") return 4
          return 1
        },
        renderCell: (properties) => (
          <FormulaUnitCell {...properties} mentionOptions={mentionOptions} referenceableIds={referenceableIds} />
        ),
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
    mentionOptions,
    referenceableIds,
    safeTextEditor,
  ])

  const rowClass = useCallback(
    (row: GridRow) => {
      const classes = ["spreadsheet-row"]
      if (row.type === "category") classes.push("spreadsheet-row-category")
      if (row.type === "metric" && row.isDirty) classes.push("spreadsheet-row-dirty")
      if (row.type === "metric" && safeHighlightedMetricId && row.id === safeHighlightedMetricId) {
        classes.push("spreadsheet-row-highlight")
      }
      return classes.join(" ")
    },
    [safeHighlightedMetricId]
  )

  const lastDetailsTriggerReference = useRef<{
    id: string
    time: number
  } | null>(null)

  const triggerDetails = useCallback(
    (rowId: string) => {
      const now = Date.now()
      const lastTrigger = lastDetailsTriggerReference.current
      if (lastTrigger && lastTrigger.id === rowId && now - lastTrigger.time < 100) {
        return
      }
      lastDetailsTriggerReference.current = { id: rowId, time: now }
      onOpenDetails(rowId)
    },
    [onOpenDetails]
  )

  const addMetricToActiveFormula = useCallback(
    (metricId: string) => {
      if (!safeActiveFormulaId) return false
      const formula = formulasById.get(safeActiveFormulaId)
      if (!formula) return false
      onFormulaChange(safeActiveFormulaId, appendMetricReference(formula.expression, metricId))
      setHighlightedMetricId(metricId)
      return true
    },
    [formulasById, onFormulaChange, safeActiveFormulaId]
  )

  const handleFormulaRowSelection = useCallback(
    (row: Extract<GridRow, { type: "formula" }>) => {
      setActiveFormulaId(row.id)
      triggerDetails(row.id)
    },
    [triggerDetails]
  )

  const handleMetricRowSelection = useCallback(
    (row: MetricRow) => {
      const didAddToFormula = addMetricToActiveFormula(row.id)
      if (!didAddToFormula) {
        triggerDetails(row.id)
      }
    },
    [addMetricToActiveFormula, triggerDetails]
  )

  const handleCellClick = useCallback(
    ({ row }: CellMouseArgs<GridRow>) => {
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
      if (!row) return
      if (isFormulaRow(row)) {
        handleFormulaRowSelection(row)
        return
      }
      if (isMetricRow(row) && !safeActiveFormulaId) {
        triggerDetails(row.id)
      }
    },
    [handleFormulaRowSelection, safeActiveFormulaId, triggerDetails]
  )

  const handleRowsChange = useCallback(
    (updatedRows: readonly GridRow[], data: RowsChangeData<GridRow>) => {
      const columnKey = data.column?.key

      for (const rowIndex of data.indexes) {
        const row = updatedRows[rowIndex]
        if (!row || !columnKey) continue

        if (isMetricRow(row)) {
          if (columnKey === "name") {
            onMetricRename?.(row.id, typeof row.name === "string" ? row.name : "")
            continue
          }
          if (columnKey !== "min" && columnKey !== "mode" && columnKey !== "max" && columnKey !== "value") {
            continue
          }

          let rawValue: unknown
          rawValue = columnKey === "value" ? (row as typeof row & { value?: unknown }).value : row[columnKey]
          const parsedValue = parseNumeric(rawValue)

          onMetricChange(row.id, columnKey, parsedValue)
          continue
        }

        if (isFormulaRow(row) && columnKey === "name") {
          onFormulaRename?.(row.id, typeof row.name === "string" ? row.name : "")
        }
      }
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
  const closeContextMenu = useCallback(() => {
    setContextMenuState(null)
  }, [])

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
        <div className="h-full">
          <TreeDataGrid
            ref={gridReference}
            className="rdg-light rdg-spreadsheet"
            columns={columns}
            rows={rows}
            style={gridStyle}
            rowHeight={density === "compact" ? 36 : 46}
            rowKeyGetter={getRowId}
            rowClass={rowClass}
            defaultColumnOptions={defaultColumnOptions}
            onCellClick={handleCellClick}
            onSelectedCellChange={handleCellFocus}
            onCellContextMenu={handleCellContextMenu}
            groupBy={categoryGroupBy}
            rowGrouper={rowGrouper}
            expandedGroupIds={expandedGroupIds}
            onExpandedGroupIdsChange={setExpandedGroupIds}
            onRowsChange={handleRowsChange}
          />
        </div>
      </ContextMenuTrigger>
      <GridContextMenu
        state={contextMenuState}
        onAddCategory={onAddCategory}
        onAddFormula={onAddFormula}
        onAddMetric={onAddMetric}
        onClose={closeContextMenu}
        onDeleteCategory={onDeleteCategory}
        onDeleteFormula={onDeleteFormula}
        onDeleteMetric={onDeleteMetric}
        onSetActiveFormulaId={setActiveFormulaId}
      />
    </ContextMenu>
  )
})

export default DataGridComponent
