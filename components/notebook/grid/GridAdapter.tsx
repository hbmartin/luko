"use client"

import { useCallback } from "react"
import type { MouseEvent, ReactNode } from "react"
import { DataGrid } from "react-data-grid"
import type { ColumnOrColumnGroup, RenderCellProps, RowRendererProps } from "react-data-grid"
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
  render: (context: { row: RowType }) => ReactNode
}

export interface GridAdapterProps<RowType extends GridAdapterRow> {
  columns: GridAdapterColumn<RowType>[]
  rows: RowType[]
  density: "comfortable" | "compact"
  rowClass?: (row: RowType) => string
  onRowReorder?: (sourceId: string, targetId: string) => void
  onContextMenu?: (event: MouseEvent, row: RowType) => void
}

function createColumns<RowType extends GridAdapterRow>(columns: GridAdapterColumn<RowType>[]): ColumnOrColumnGroup<RowType>[] {
  return columns.map((column) => ({
    key: column.key,
    name: column.name,
    width: column.width,
    frozen: column.frozen,
    renderCell: (props: RenderCellProps<RowType>) => column.render({ row: props.row }),
  }))
}

function defaultRowRenderer<RowType extends GridAdapterRow>(
  onRowReorder?: (sourceId: string, targetId: string) => void,
  onContextMenu?: (event: MouseEvent, row: RowType) => void,
): React.ComponentType<RowRendererProps<RowType>> {
  return function RowRenderer(props: RowRendererProps<RowType>) {
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
      [row.id],
    )

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const sourceId = event.dataTransfer.getData("application/grid-row")
        if (sourceId && sourceId !== row.id) {
          onRowReorder?.(sourceId, row.id)
        }
      },
      [onRowReorder, row.id],
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
}: GridAdapterProps<RowType>) {
  const resolvedColumns = createColumns(columns)
  const rowHeight = density === "compact" ? 36 : 46

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] shadow-sm">
      <DataGrid
        className="rdg-light h-full"
        columns={resolvedColumns}
        rows={rows}
        rowHeight={rowHeight}
        rowKeyGetter={(row) => row.id}
        rowClass={(row) => rowClass?.(row) ?? ""}
        rowRenderer={defaultRowRenderer(onRowReorder, onContextMenu)}
        defaultColumnOptions={{ resizable: true }}
      />
    </div>
  )
}

export default GridAdapter
