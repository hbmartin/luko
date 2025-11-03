"use client"

import { DistributionChart } from "@/components/notebook/charts/DistributionChart"
import { FormulaEditor } from "@/components/notebook/FormulaEditor"
import { Formula, Metric, Notebook } from "@/lib/types/notebook"

interface MetricDetailPanelProps {
  notebook: Notebook
  metric: Metric | null
  formula?: Formula | null
  onFormulaChange?: (formulaId: string, expression: string) => void
}

export function MetricDetailPanel({ notebook, metric, formula = null, onFormulaChange }: MetricDetailPanelProps) {
  const distribution = metric?.distribution ?? null
  const metricValidationFields = metric?.validation?.fields ?? {}

  if (!metric && !formula) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <p className="text-sm text-[var(--color-text-muted)]">Select a row to view more details.</p>
      </div>
    )
  }

  if (formula && !metric) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <FormulaEditor notebook={notebook} formula={formula} onFormulaChange={onFormulaChange} />
          {/* {noteSection} */}
        </div>
      </div>
    )
  }

  if (metric) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-4 shadow-sm">
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
            {(metricValidationFields.min || metricValidationFields.mode || metricValidationFields.max) && (
              <div className="mt-2 space-y-1 text-[10px]">
                {metricValidationFields.min && <p className="text-red-500">Min: {metricValidationFields.min}</p>}
                {metricValidationFields.mode && (
                  <p className="text-red-500">Most likely: {metricValidationFields.mode}</p>
                )}
                {metricValidationFields.max && <p className="text-red-500">Max: {metricValidationFields.max}</p>}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Unit: {metric.unit ?? "—"}</h4>
          </section>

          {/* {noteSection} */}

          {metric.formula && (
            <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Formula</h4>
              <pre className="mt-2 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">
                {metric.formula}
              </pre>
            </section>
          )}
        </div>
      </div>
    )
  }

  return null
}
