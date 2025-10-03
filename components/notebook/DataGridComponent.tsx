"use client"

import { useMemo } from "react"
import type { Notebook } from "@/lib/types/notebook"
import { formatCurrency, formatNumber, notebookToGridRows } from "@/lib/utils/grid-helpers"
import { GridAdapter } from "./grid/GridAdapter"

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

  return (
    <GridAdapter
      density={density}
      rows={rows}
      onRowReorder={onRowReorder}
      onContextMenu={(event, row) => {
        if (row.type === "metric") {
          onContextRequest({ rowId: row.id, clientX: event.clientX, clientY: event.clientY })
        }
      }}
      rowClass={(row) => {
        if (row.type === "category") return "bg-[var(--color-surface-muted)] font-semibold"
        if (row.isDirty) return "bg-blue-50"
        return ""
      }}
      columns={[
        {
          key: "name",
          name: "Metric",
          width: 320,
          frozen: true,
          render: ({ row }) => {
            if (row.type === "category") {
              return (
                <div className="flex items-center gap-3 font-semibold text-[var(--color-text-primary)]">
                  <button
                    type="button"
                    onClick={() => onCategoryToggle(row.id)}
                    className="flex size-6 items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white text-[var(--color-text-primary)] transition hover:bg-blue-50"
                  >
                    {row.isExpanded ? "−" : "+"}
                  </button>
                  <span>{row.name}</span>
                </div>
              )
            }

            return (
              <div className="flex items-center justify-between pl-8">
                <div>
                  <p className={`text-sm ${row.isDirty ? "font-semibold text-blue-700" : "text-[var(--color-text-primary)]"}`}>
                    {row.name}
                  </p>
                  {row.description && (
                    <p className="text-xs text-[var(--color-text-muted)]">{row.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDetails(row.id)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
                >
                  Details
                </button>
              </div>
            )
          },
        },
        {
          key: "unit",
          name: "Unit",
          width: 120,
          render: ({ row }) => {
            if (row.type === "category") return null
            return <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{row.unit}</span>
          },
        },
        {
          key: "min",
          name: "Min",
          width: 120,
          render: ({ row }) => {
            if (row.type === "category") return null
            if (row.value !== null) {
              return <span className="text-xs text-[var(--color-text-muted)]">{formatNumber(row.value, 2)}</span>
            }

            const error = validationErrors[row.id]?.min
            return (
              <input
                type="number"
                key={`${row.id}-min-${row.min ?? ""}`}
                defaultValue={row.min ?? ""}
                onBlur={(event) => {
                  const nextValue = Number.parseFloat(event.currentTarget.value)
                  if (!Number.isNaN(nextValue)) {
                    onMetricChange(row.id, "min", nextValue)
                  }
                }}
                data-validation={error ? "error" : undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${row.id}-min-error` : undefined}
                className="w-full rounded-md border px-2 py-1 text-sm text-[var(--color-text-primary)] focus-visible:data-[focus=strong]"
              />
            )
          },
        },
        {
          key: "mode",
          name: "Most Likely",
          width: 140,
          render: ({ row }) => {
            if (row.type === "category") return null

            const error = validationErrors[row.id]?.mode

            const isFixed = row.value !== null
            return (
              <input
                type="number"
                key={`${row.id}-mode-${isFixed ? row.value ?? "" : row.mode ?? ""}`}
                defaultValue={isFixed ? row.value ?? "" : row.mode ?? ""}
                onBlur={(event) => {
                  const nextValue = Number.parseFloat(event.currentTarget.value)
                  if (!Number.isNaN(nextValue)) {
                    onMetricChange(row.id, isFixed ? "value" : "mode", nextValue)
                  }
                }}
                data-validation={error ? "error" : undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${row.id}-mode-error` : undefined}
                className="w-full rounded-md border px-2 py-1 text-sm text-[var(--color-text-primary)]"
              />
            )
          },
        },
        {
          key: "max",
          name: "Max",
          width: 120,
          render: ({ row }) => {
            if (row.type === "category") return null
            if (row.value !== null) {
              return <span className="text-xs text-[var(--color-text-muted)]">{formatNumber(row.value, 2)}</span>
            }

            const error = validationErrors[row.id]?.max
            return (
              <input
                type="number"
                key={`${row.id}-max-${row.max ?? ""}`}
                defaultValue={row.max ?? ""}
                onBlur={(event) => {
                  const nextValue = Number.parseFloat(event.currentTarget.value)
                  if (!Number.isNaN(nextValue)) {
                    onMetricChange(row.id, "max", nextValue)
                  }
                }}
                data-validation={error ? "error" : undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${row.id}-max-error` : undefined}
                className="w-full rounded-md border px-2 py-1 text-sm text-[var(--color-text-primary)]"
              />
            )
          },
        },
        {
          key: "summary",
          name: "Summary",
          width: 220,
          render: ({ row }) => {
            if (row.type === "category") {
              return (
                <div className="text-xs text-[var(--color-text-muted)]">
                  {row.isExpanded ? "Hide metrics" : "Show metrics"}
                </div>
              )
            }
            if (row.formula) {
              return (
                <div className="text-xs text-[var(--color-text-muted)]">
                  Formula
                  <code className="ml-2 rounded bg-slate-900/80 px-2 py-1 text-[10px] text-slate-100">
                    {row.formula}
                  </code>
                </div>
              )
            }
            if (row.value !== null) {
              const format = row.unit?.includes("$") ? formatCurrency : formatNumber
              return (
                <div className="text-xs text-[var(--color-text-muted)]">
                  Fixed at <span className="font-semibold text-[var(--color-text-primary)]">{format(row.value)}</span>
                </div>
              )
            }

            const min = row.min ? formatNumber(row.min) : "—"
            const mode = row.mode ? formatNumber(row.mode) : "—"
            const max = row.max ? formatNumber(row.max) : "—"
            return (
              <div className="text-xs text-[var(--color-text-muted)]">
                Range {min} → {mode} → {max}
              </div>
            )
          },
        },
      ]}
    />
  )
}

export default DataGridComponent
