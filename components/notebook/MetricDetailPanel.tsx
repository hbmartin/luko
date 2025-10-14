"use client"

import { DistributionChart } from "@/components/notebook/charts/DistributionChart"
import { Metric } from "@/lib/types/notebook"

interface ValidationState {
  min?: string
  mode?: string
  max?: string
  value?: string
}

interface MetricDetailPanelProps {
  metric: Metric | null
  validation?: ValidationState
}

export function MetricDetailPanel({ metric, validation }: MetricDetailPanelProps) {
  const distribution = metric?.distribution ?? null

  return (
    <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
      {!metric ? (
        <p className="text-sm text-[var(--color-text-muted)]">Select a metric in the worksheet to view its details.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{metric.name}</div>
            {metric.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.description}</p>}
          </div>

          <section className="rounded-2xl">
            <div className="mt-3">
              {distribution ? (
                <DistributionChart metric={metric} distribution={distribution} />
              ) : (
                <div className="items-center justify-center">
                  <p className="p-8 text-center text-xs">
                    Please configure min, most likely, and max values for this metric.
                  </p>
                </div>
              )}
            </div>
            {(validation?.min || validation?.mode || validation?.max) && (
              <div className="mt-2 space-y-1 text-[10px]">
                {validation?.min && <p className="text-red-500">Min: {validation.min}</p>}
                {validation?.mode && <p className="text-red-500">Most likely: {validation.mode}</p>}
                {validation?.max && <p className="text-red-500">Max: {validation.max}</p>}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Unit: {metric.unit ?? "—"}</h4>
          </section>

          {metric.formula && (
            <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Formula</h4>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">
                {metric.formula}
              </pre>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
