"use client"

import { FormEvent, type MouseEvent, useEffect, useId, useMemo, useState } from "react"
import type { FormulaRow, Metric } from "@/lib/types/notebook"
import { cn } from "@/lib/utils"
import { type ExpressionToken, expressionToTokens, tokensToExpression } from "@/lib/utils/formulaTokens"

interface FormulaRowCellProps {
  formula: FormulaRow
  metrics: Metric[]
  isActive: boolean
  onActivate: () => void
  onExpressionChange: (expression: string) => void
  onHighlightMetric: (metricId: string) => void
  validationMessage?: string | null
}

const operatorTokens = new Set(["+", "-", "*", "/"])
const parenthesisTokens = new Set(["(", ")"])
const numericPattern = /^-?\d+(?:\.\d+)?$/

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
  onExpressionChange,
  onHighlightMetric,
  validationMessage,
}: FormulaRowCellProps) {
  const inputId = useId()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<ExpressionToken[]>(() => expressionToTokens(formula.expression))

  useEffect(() => {
    setTokens(expressionToTokens(formula.expression))
  }, [formula.expression])

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

    let nextToken: ExpressionToken | null = null
    if (operatorTokens.has(value)) {
      nextToken = { type: "operator", value }
    } else if (parenthesisTokens.has(value)) {
      nextToken = { type: "paren", value: value as "(" | ")" }
    } else if (numericPattern.test(value)) {
      nextToken = { type: "number", value }
    } else {
      const metric = metricsByName.get(value.toLowerCase())
      if (!metric) {
        setError("Select a metric name, number, or operator")
        return
      }
      nextToken = { type: "metric", metricId: metric.id }
      onHighlightMetric(metric.id)
    }

    const nextTokens = [...tokens, nextToken]
    setTokens(nextTokens)
    onExpressionChange(tokensToExpression(nextTokens))
    setDraft("")
    setError(null)
  }

  const removeTokenAt = (index: number) => {
    const next = [...tokens.slice(0, index), ...tokens.slice(index + 1)]
    setTokens(next)
    onExpressionChange(tokensToExpression(next))
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
          {tokens.map((token, index) => {
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

            const display = token.type === "operator" || token.type === "paren" ? token.value : token.value
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
              if (event.key === "Backspace" && draft === "" && tokens.length > 0) {
                event.preventDefault()
                removeTokenAt(tokens.length - 1)
              }
              if (event.key === "Escape") {
                setDraft("")
                setError(null)
              }
            }}
            placeholder={tokens.length === 0 ? "Build formula with metrics…" : ""}
            autoComplete="off"
          />
          <datalist id={`${inputId}-options`}>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.name} />
            ))}
            {Array.from(operatorTokens).map((operator) => (
              <option key={operator} value={operator} />
            ))}
            {Array.from(parenthesisTokens).map((paren) => (
              <option key={paren} value={paren} />
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
