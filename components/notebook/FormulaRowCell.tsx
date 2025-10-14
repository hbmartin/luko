"use client"

import { FormEvent, type MouseEvent, useId, useMemo, useState } from "react"
import type { FormulaRow, FormulaToken, Metric } from "@/lib/types/notebook"
import { cn } from "@/lib/utils"

interface FormulaRowCellProps {
  formula: FormulaRow
  metrics: Metric[]
  isActive: boolean
  onActivate: () => void
  onTokensChange: (tokens: FormulaToken[]) => void
  onHighlightMetric: (metricId: string) => void
  validationMessage?: string | null
}

const operatorTokens = new Set(["+", "-", "*", "/", "(", ")"])

const colorPalette = [
  "#bfdbfe",
  "#fde68a",
  "#fbcfe8",
  "#bbf7d0",
  "#fca5a5",
  "#c4b5fd",
  "#fef08a",
  "#fca5a5",
  "#a5f3fc",
  "#e9d5ff",
]

export function FormulaRowCell({
  formula,
  metrics,
  isActive,
  onActivate,
  onTokensChange,
  onHighlightMetric,
  validationMessage,
}: FormulaRowCellProps) {
  const inputId = useId()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const metricsByName = useMemo(() => {
    const map = new Map<string, Metric>()
    metrics.forEach((metric) => {
      map.set(metric.name.toLowerCase(), metric)
    })
    return map
  }, [metrics])

  const metricsById = useMemo(() => {
    const map = new Map<string, { metric: Metric; colorIndex: number }>()
    metrics.forEach((metric, index) => {
      map.set(metric.id, { metric, colorIndex: index })
    })
    return map
  }, [metrics])

  const metricColor = (metricId: string) => {
    const entry = metricsById.get(metricId)
    if (!entry) return "#cbd5f5"
    const index = entry.colorIndex
    return colorPalette[index % colorPalette.length] ?? colorPalette[0]
  }

  const commitToken = (rawValue: string) => {
    const value = rawValue.trim()
    if (!value) return

    if (operatorTokens.has(value)) {
      const nextToken: FormulaToken =
        value === "(" || value === ")"
          ? { type: "paren", value }
          : { type: "operator", value: value as "+" | "-" | "*" | "/" }
      onTokensChange([...formula.tokens, nextToken])
      setDraft("")
      setError(null)
      return
    }

    const metric = metricsByName.get(value.toLowerCase())
    if (!metric) {
      setError("Select a metric name or operator")
      return
    }

    onTokensChange([...formula.tokens, { type: "metric", metricId: metric.id }])
    onHighlightMetric(metric.id)
    setDraft("")
    setError(null)
  }

  const removeTokenAt = (index: number) => {
    const next = [...formula.tokens.slice(0, index), ...formula.tokens.slice(index + 1)]
    onTokensChange(next)
  }

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!isActive) {
      onActivate()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    commitToken(draft)
  }

  const helpMessage = error ?? validationMessage ?? null

  return (
    <div
      role="presentation"
      onClick={handleContainerClick}
      className={cn("formula-row-cell", isActive && "formula-row-cell-active")}
    >
      <form className="formula-row-editor" onSubmit={handleSubmit}>
        <div className="formula-row-tokens">
          {formula.tokens.map((token, index) => {
            if (token.type === "metric") {
              const entry = metricsById.get(token.metricId)
              const metric = entry?.metric
              return (
                <button
                  type="button"
                  key={`${token.metricId}-${index}`}
                  className="formula-token formula-token-metric"
                  style={{ backgroundColor: metricColor(token.metricId) }}
                  onClick={(event) => {
                    event.stopPropagation()
                    onHighlightMetric(token.metricId)
                  }}
                >
                  <span>{metric?.name ?? token.metricId}</span>
                  <span
                    className="formula-token-remove"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeTokenAt(index)
                    }}
                    aria-hidden="true"
                  >
                    ×
                  </span>
                </button>
              )
            }

            const display = token.value
            return (
              <button
                type="button"
                key={`${token.type}-${display}-${index}`}
                className="formula-token formula-token-operator"
                onClick={(event) => {
                  event.stopPropagation()
                  removeTokenAt(index)
                }}
              >
                {display}
              </button>
            )
          })}
          <input
            id={inputId}
            list={`${inputId}-options`}
            type="text"
            className="formula-row-input"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault()
                commitToken(draft)
              }
              if (event.key === "Backspace" && draft === "" && formula.tokens.length > 0) {
                event.preventDefault()
                removeTokenAt(formula.tokens.length - 1)
              }
              if (event.key === "Escape") {
                setDraft("")
                setError(null)
              }
            }}
            placeholder={formula.tokens.length === 0 ? "Build formula with metrics…" : ""}
            autoComplete="off"
          />
          <datalist id={`${inputId}-options`}>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.name} />
            ))}
            {Array.from(operatorTokens).map((operator) => (
              <option key={operator} value={operator} />
            ))}
          </datalist>
        </div>
        <button type="submit" className="formula-row-submit" aria-label="Add token">
          +
        </button>
      </form>
      {helpMessage && <p className="formula-row-error">{helpMessage}</p>}
    </div>
  )
}
