"use client"

import { Metric } from "@/lib/types/notebook"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/grid-helpers"

interface ValidationState {
  min?: string
  mode?: string
  max?: string
  value?: string
}

interface MetricDetailDrawerProps {
  metric: Metric | null
  validation?: ValidationState
}

const formatValue = (metric: Metric, value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  if (metric.unit?.includes("%")) return formatPercentage(value)
  if (metric.unit?.includes("$")) return formatCurrency(value)
  return formatNumber(value)
}

export function MetricDetailDrawer({ metric, validation }: MetricDetailDrawerProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
      <h3 className="mb-[var(--space-300)] text-lg font-semibold text-[var(--color-text-primary)]">Metric Details</h3>

      {!metric ? (
        <p className="text-sm text-[var(--color-text-muted)]">Select a metric in the worksheet to view its details.</p>
      ) : (
        <div className="space-y-[var(--space-400)]">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Selected metric
            </div>
            <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{metric.name}</div>
            {metric.description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.description}</p>
            )}
          </div>

          <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-[var(--space-400)]">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Distribution</h4>
            <dl className="mt-3 grid grid-cols-3 gap-4 text-xs text-[var(--color-text-muted)]">
              <div>
                <dt className="uppercase tracking-wide">Min</dt>
                <dd className={`mt-1 font-medium ${validation?.min ? "text-red-500" : "text-[var(--color-text-primary)]"}`}>
                  {formatValue(metric, metric.distribution?.min ?? metric.value ?? null)}
                </dd>
                {validation?.min && <p className="mt-1 text-[10px] text-red-500">{validation.min}</p>}
              </div>
              <div>
                <dt className="uppercase tracking-wide">Mode</dt>
                <dd className={`mt-1 font-medium ${validation?.mode ? "text-red-500" : "text-[var(--color-text-primary)]"}`}>
                  {formatValue(metric, metric.distribution?.mode ?? metric.value ?? null)}
                </dd>
                {validation?.mode && <p className="mt-1 text-[10px] text-red-500">{validation.mode}</p>}
              </div>
              <div>
                <dt className="uppercase tracking-wide">Max</dt>
                <dd className={`mt-1 font-medium ${validation?.max ? "text-red-500" : "text-[var(--color-text-primary)]"}`}>
                  {formatValue(metric, metric.distribution?.max ?? metric.value ?? null)}
                </dd>
                {validation?.max && <p className="mt-1 text-[10px] text-red-500">{validation.max}</p>}
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Unit</h4>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.unit ?? "—"}</p>
          </section>

          {metric.formula && (
            <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Formula</h4>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">{metric.formula}</pre>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
