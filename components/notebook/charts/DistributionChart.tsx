"use client"

import betaPDF from "@stdlib/stats-base-dists-beta-pdf"
import { useId, useMemo } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Distribution, Metric } from "@/lib/types/notebook"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/grid-helpers"

const DEFAULT_GAMMA = 4
const DEFAULT_POINTS = 101

const formatMetricValue = (metric: Metric, value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  if (metric.unit?.includes("%")) return formatPercentage(value)
  if (metric.unit?.includes("$")) return formatCurrency(value)
  return formatNumber(value)
}

export const generatePertPdfData = (distribution: Distribution, gamma = DEFAULT_GAMMA, points = DEFAULT_POINTS) => {
  const { min: a, mode: m, max: b } = distribution
  if (a >= b || m < a || m > b || gamma <= 0) return []

  const range = b - a
  if (range <= 0) return []

  const alpha = 1 + gamma * ((m - a) / range)
  const beta = 1 + gamma * ((b - m) / range)
  if (alpha <= 0 || beta <= 0) return []

  const step = range / (points - 1)
  const data: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points; i++) {
    const xPert = a + i * step
    const xBeta = (xPert - a) / range
    if (xBeta < 0 || xBeta > 1) continue

    const pdfBeta = betaPDF(xBeta, alpha, beta)
    const yPert = pdfBeta / range
    if (!Number.isFinite(yPert)) continue

    data.push({ x: xPert, y: yPert })
  }

  return data
}

const createReferenceLineLabel =
  (label: string, align: "left" | "center" | "right") =>
  ({ viewBox }: any) => {
    if (!viewBox) return null
    const { x, y } = viewBox
    if (x === undefined || y === undefined) return null

    const textAnchor =
      align === "left" ? "start" : align === "right" ? "end" : "middle"
    const xOffset = align === "left" ? 8 : align === "right" ? -8 : 0

    return (
      <text
        x={x + xOffset}
        y={y - 12}
        fill="var(--color-text-muted)"
        fontSize={11}
        textAnchor={textAnchor}
        opacity={0.9}
      >
        {label}
      </text>
    )
  }

interface DistributionChartProps {
  distribution: Distribution
  metric: Metric
}

export function DistributionChart({ metric, distribution }: DistributionChartProps) {
  const pdfData = useMemo(
    () => generatePertPdfData(distribution),
    [distribution.min, distribution.mode, distribution.max]
  )
  const hasData = pdfData.length > 0
  const maxDensity = useMemo(() => (hasData ? Math.max(...pdfData.map((point) => point.y)) : 0), [pdfData, hasData])

  const rawGradientId = useId()
  const gradientId = `pertDensityGradient-${rawGradientId.replace(/[:]/g, "")}`

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-xs text-[var(--color-text-muted)]">No distribution data available for this metric.</p>
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pdfData} margin={{ top: 16, right: 16, left: -4, bottom: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-primary)" strokeOpacity={0.15} strokeDasharray="4 4" />
          <XAxis
            dataKey="x"
            type="number"
            tickFormatter={(value: number) => formatMetricValue(metric, value)}
            stroke="var(--color-primary)"
            strokeOpacity={0.3}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
          />
          <YAxis
            type="number"
            domain={[0, maxDensity ? maxDensity * 1.1 : "auto"]}
            tickFormatter={(value: number) => formatNumber(value)}
            stroke="var(--color-primary)"
            strokeOpacity={0.3}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            labelFormatter={(value: number) => formatMetricValue(metric, value)}
            contentStyle={{
              background: "var(--color-surface-elevated)",
              borderColor: "var(--color-primary)",
              color: "var(--color-text-primary)",
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="var(--color-primary)"
            strokeWidth={3}
            strokeLinecap="round"
            dot={false}
            strokeOpacity={0.85}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={distribution.min}
            stroke="var(--color-accent)"
            strokeOpacity={0.4}
            strokeDasharray="5 5"
            label={createReferenceLineLabel(`Min ${formatMetricValue(metric, distribution.min)}`, "left")}
          />
          <ReferenceLine
            x={distribution.mode}
            stroke="var(--color-accent)"
            strokeDasharray="5 5"
            label={createReferenceLineLabel(`Most likely ${formatMetricValue(metric, distribution.mode)}`, "center")}
          />
          <ReferenceLine
            x={distribution.max}
            stroke="var(--color-accent)"
            strokeOpacity={0.4}
            strokeDasharray="5 5"
            label={createReferenceLineLabel(`Max ${formatMetricValue(metric, distribution.max)}`, "right")}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
