"use client"

import { useMemo, useCallback } from "react"
import { DataGrid, Column } from "react-data-grid"
import "react-data-grid/lib/styles.css"
import { Notebook, GridRow } from "@/lib/types/notebook"
import { notebookToGridRows, formatNumber, formatPercentage } from "@/lib/utils/grid-helpers"

interface DataGridComponentProps {
  notebook: Notebook
  onMetricChange: (metricId: string, field: string, value: number) => void
  onCategoryToggle: (categoryId: string) => void
}

export function DataGridComponent({
  notebook,
  onMetricChange,
  onCategoryToggle,
}: DataGridComponentProps) {
  const rows = useMemo(() => notebookToGridRows(notebook), [notebook])

  const columns = useMemo<Column<GridRow>[]>(
    () => [
      {
        key: "name",
        name: "Metric Name",
        frozen: true,
        width: 320,
        renderCell: (props) => {
          const { row } = props

          if (row.type === "category") {
            return (
              <div className="flex items-center gap-2 font-semibold">
                <button
                  onClick={() => onCategoryToggle(row.id)}
                  className="flex size-5 items-center justify-center rounded hover:bg-gray-200"
                >
                  {row.isExpanded ? (
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-gray-900">{row.name}</span>
              </div>
            )
          }

          return (
            <div className="flex items-center pl-8">
              <span className={row.isDirty ? "font-medium text-blue-600" : "text-gray-700"}>
                {row.name}
              </span>
              {row.isDirty && (
                <span className="ml-2 size-2 rounded-full bg-blue-500" title="Changed"></span>
              )}
            </div>
          )
        },
      },
      {
        key: "unit",
        name: "Unit",
        width: 100,
        renderCell: (props) => {
          if (props.row.type === "category") return null
          return (
            <span className="text-sm text-gray-600">
              {props.row.unit || "—"}
            </span>
          )
        },
      },
      {
        key: "min",
        name: "Min",
        width: 120,
        renderCell: (props) => {
          if (props.row.type === "category") return null
          if (props.row.value !== null) return <span className="text-gray-400">—</span>

          return (
            <input
              type="number"
              value={props.row.min ?? ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                if (!isNaN(value)) {
                  onMetricChange(props.row.id, "min", value)
                }
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              step="any"
            />
          )
        },
      },
      {
        key: "mode",
        name: "Most Likely",
        width: 120,
        renderCell: (props) => {
          if (props.row.type === "category") return null

          // Fixed value
          if (props.row.value !== null) {
            return (
              <input
                type="number"
                value={props.row.value ?? ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value)) {
                    onMetricChange(props.row.id, "value", value)
                  }
                }}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                step="any"
              />
            )
          }

          // Distribution mode
          return (
            <input
              type="number"
              value={props.row.mode ?? ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                if (!isNaN(value)) {
                  onMetricChange(props.row.id, "mode", value)
                }
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              step="any"
            />
          )
        },
      },
      {
        key: "max",
        name: "Max",
        width: 120,
        renderCell: (props) => {
          if (props.row.type === "category") return null
          if (props.row.value !== null) return <span className="text-gray-400">—</span>

          return (
            <input
              type="number"
              value={props.row.max ?? ""}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                if (!isNaN(value)) {
                  onMetricChange(props.row.id, "max", value)
                }
              }}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              step="any"
            />
          )
        },
      },
    ],
    [onCategoryToggle, onMetricChange],
  )

  const rowKeyGetter = useCallback((row: GridRow) => row.id, [])

  const rowClass = useCallback((row: GridRow) => {
    if (row.type === "category") {
      return "bg-gray-100 font-semibold"
    }
    return row.isDirty ? "bg-blue-50" : ""
  }, [])

  return (
    <div className="h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <DataGrid
        columns={columns}
        rows={rows}
        rowKeyGetter={rowKeyGetter}
        rowClass={rowClass}
        className="rdg-light h-full"
        style={{ height: "100%" }}
        defaultColumnOptions={{
          resizable: true,
        }}
      />
    </div>
  )
}
