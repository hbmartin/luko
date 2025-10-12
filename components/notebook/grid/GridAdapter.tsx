"use client"

import { useCallback } from "react"
import type { MouseEvent, ReactNode } from "react"
import { DataGrid } from "react-data-grid"
import type {
  CellMouseEventHandler,
  CellSelectArgs,
  ColSpanArgs,
  ColumnOrColumnGroup,
  RenderCellProps,
  RenderRowProps,
} from "react-data-grid"
import "react-data-grid/lib/styles.css"

export interface GridAdapterRow {
  id: string
  depth: number
}

export interface GridAdapterColumn<RowType extends GridAdapterRow> {
  key: string
  name: string
  width?: number
  frozen?: boolean
  cellClass?: string | ((row: RowType) => string | undefined)
  headerCellClass?: string
  colSpan?: (args: ColSpanArgs<RowType, unknown>) => number | undefined
  render: (context: { row: RowType }) => ReactNode
}

export interface GridAdapterProps<RowType extends GridAdapterRow> {
  columns: GridAdapterColumn<RowType>[]
  rows: RowType[]
  density: "comfortable" | "compact"
  rowClass?: (row: RowType) => string
  onRowReorder?: (sourceId: string, targetId: string) => void
  onContextMenu?: (event: MouseEvent, row: RowType) => void
  onCellClick?: CellMouseEventHandler<RowType, unknown>
  onSelectedCellChange?: (args: CellSelectArgs<RowType, unknown>) => void
}

function createColumns<RowType extends GridAdapterRow>(
  columns: GridAdapterColumn<RowType>[]
): ColumnOrColumnGroup<RowType>[] {
  return columns.map((column) => ({
    key: column.key,
    name: column.name,
    width: column.width,
    frozen: column.frozen,
    cellClass: column.cellClass,
    headerCellClass: column.headerCellClass,
    colSpan: column.colSpan,
    renderCell: (props: RenderCellProps<RowType>) => column.render({ row: props.row }),
  }))
}

function defaultRowRenderer<RowType extends GridAdapterRow>(
  onRowReorder?: (sourceId: string, targetId: string) => void,
  onContextMenu?: (event: MouseEvent, row: RowType) => void
): React.ComponentType<RenderRowProps<RowType, unknown>> {
  return function RowRenderer(props: RenderRowProps<RowType, unknown>) {
    const { row, ...rest } = props

    const handleDragStart = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("application/grid-row", row.id)
        const dragImage = document.createElement("div")
        dragImage.style.position = "fixed"
        dragImage.style.top = "-9999px"
        dragImage.textContent = "Reordering…"
        document.body.appendChild(dragImage)
        event.dataTransfer.setDragImage(dragImage, 0, 0)
        setTimeout(() => document.body.removeChild(dragImage), 0)
      },
      [row.id]
    )

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const sourceId = event.dataTransfer.getData("application/grid-row")
        if (sourceId && sourceId !== row.id) {
          onRowReorder?.(sourceId, row.id)
        }
      },
      [onRowReorder, row.id]
    )

    return (
      <div
        {...rest}
        role="row"
        onContextMenu={(event) => {
          if (onContextMenu) {
            event.preventDefault()
            onContextMenu(event, row)
          }
        }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        data-depth={row.depth}
      />
    )
  }
}

export function GridAdapter<RowType extends GridAdapterRow>({
  columns,
  rows,
  density,
  rowClass,
  onRowReorder,
  onContextMenu,
  onCellClick,
  onSelectedCellChange,
}: GridAdapterProps<RowType>) {
  const resolvedColumns = createColumns(columns)
  const rowHeight = density === "compact" ? 36 : 46
  const RowRenderer = defaultRowRenderer<RowType>(onRowReorder, onContextMenu)

  return (
    <div className="h-full min-h-0 min-w-0 flex-1">
      <DataGrid
        className="rdg-light rdg-spreadsheet h-full w-full"
        style={{ height: "100%", width: "100%" }}
        columns={resolvedColumns}
        rows={rows}
        rowHeight={rowHeight}
        rowKeyGetter={(row) => row.id}
        rowClass={(row) => rowClass?.(row) ?? ""}
        // renderers={{
        //   renderRow: (key, props) => <RowRenderer key={key} {...props} />,
        // }}
        defaultColumnOptions={{ resizable: true }}
        onCellClick={onCellClick}
        onSelectedCellChange={onSelectedCellChange}
      />
    </div>
  )
}

export default GridAdapter
