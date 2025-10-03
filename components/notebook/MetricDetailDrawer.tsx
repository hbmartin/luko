"use client"

import * as Dialog from "@radix-ui/react-dialog"
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
  onClose: () => void
}

const formatValue = (metric: Metric, value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  if (metric.unit?.includes("%")) return formatPercentage(value)
  if (metric.unit?.includes("$")) return formatCurrency(value)
  return formatNumber(value)
}

export function MetricDetailDrawer({ metric, validation, onClose }: MetricDetailDrawerProps) {
  return (
    <Dialog.Root open={Boolean(metric)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-500)] shadow-lg">
          {metric && (
            <div className="space-y-[var(--space-500)]">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {metric.name}
                  </Dialog.Title>
                  {metric.description && (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.description}</p>
                  )}
                </div>
                <Dialog.Close className="rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
                  Close
                </Dialog.Close>
              </header>

              <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-[var(--space-400)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Distribution</h2>
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
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Unit</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{metric.unit}</p>
              </section>

              {metric.formula && (
                <section className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-[var(--space-400)]">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Formula</h3>
                  <pre className="mt-2 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">
                    {metric.formula}
                  </pre>
                </section>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
