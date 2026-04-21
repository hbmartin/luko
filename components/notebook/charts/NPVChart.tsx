"use client"

import { memo, useMemo, useState } from "react"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

interface YearlyResult {
  year: number
  net: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
    mean: number
  }
}

export interface NPVSeries {
  id: string
  label: string
  color: string
  data: YearlyResult[]
}

interface NPVChartProperties {
  series: NPVSeries[]
}

const width = 600
const height = 300
const padding = { top: 20, right: 40, bottom: 40, left: 60 } as const
const chartWidth = width - padding.left - padding.right
const chartHeight = height - padding.top - padding.bottom
const viewBox = ["0", "0", String(width), String(height)].join(" ")
const chartTransform = ["translate(", String(padding.left), ", ", String(padding.top), ")"].join("")
const yTickCount = 5

const createCoordinate = (x: number, y: number) => [String(x), ",", String(y)].join("")

const createPath = (
  data: YearlyResult[],
  xScale: (index: number) => number,
  yScale: (value: number) => number,
  getValue: (result: YearlyResult) => number
) => {
  return data
    .map((result, index) => {
      const x = xScale(index)
      const y = yScale(getValue(result))
      return [index === 0 ? "M " : "L ", createCoordinate(x, y)].join("")
    })
    .join(" ")
}

const createArea = (
  data: YearlyResult[],
  xScale: (index: number) => number,
  yScale: (value: number) => number,
  getUpper: (result: YearlyResult) => number,
  getLower: (result: YearlyResult) => number
) => {
  const upperPath = data.map((result, index) => createCoordinate(xScale(index), yScale(getUpper(result)))).join(" ")
  const lowerPath = data
    .map((result, index) => createCoordinate(xScale(index), yScale(getLower(result))))
    .toReversed()
    .join(" ")
  return ["M ", upperPath, " L ", lowerPath, " Z"].join("")
}

export const NPVChart = memo(function NPVChart({ series }: NPVChartProperties) {
  const chart = useMemo(() => {
    const primary = series[0]
    if (!primary || primary.data.length === 0) return null

    const data = primary.data
    const allValues: number[] = []
    for (const entry of series) {
      for (const result of entry.data) {
        allValues.push(result.net.p10, result.net.p90)
      }
    }

    const minValue = Math.min(0, ...allValues)
    const rawMaxValue = Math.max(...allValues)
    const maxValue = rawMaxValue === minValue ? minValue + 1 : rawMaxValue
    const xScale = (index: number) => ((index + 1) / data.length) * chartWidth
    const yScale = (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight

    const primaryPoints = data.map((result, index) => ({
      result,
      x: xScale(index),
      y: yScale(result.net.p50),
    }))

    const comparisonPaths = series.slice(1).map((entry) => ({
      color: entry.color,
      id: entry.id,
      path: createPath(entry.data, xScale, yScale, (result) => result.net.p50),
    }))

    return {
      primary,
      data,
      primaryPoints,
      comparisonPaths,
      p50Path: createPath(data, xScale, yScale, (result) => result.net.p50),
      p25Path: createPath(data, xScale, yScale, (result) => result.net.p25),
      p75Path: createPath(data, xScale, yScale, (result) => result.net.p75),
      p10Path: createPath(data, xScale, yScale, (result) => result.net.p10),
      p90Path: createPath(data, xScale, yScale, (result) => result.net.p90),
      area5090: createArea(
        data,
        xScale,
        yScale,
        (result) => result.net.p90,
        (result) => result.net.p10
      ),
      area2575: createArea(
        data,
        xScale,
        yScale,
        (result) => result.net.p75,
        (result) => result.net.p25
      ),
      yTickValues: Array.from({ length: yTickCount }, (_value, index) => {
        return minValue + (index * (maxValue - minValue)) / (yTickCount - 1)
      }),
      xScale,
      yScale,
    }
  }, [series])

  if (!chart) return null

  const { primary } = chart

  return (
    <div>
      <div className="relative">
        <svg viewBox={viewBox} className="w-full" role="img" aria-label="NPV over time chart">
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {chart.yTickValues.map((value, index) => {
            const y = padding.top + chart.yScale(value)
            return (
              <g key={index}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                <text
                  x={padding.left - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="fill-gray-600 text-xs"
                >
                  {formatAbbreviatedNumber(value)}
                </text>
              </g>
            )
          })}

          {chart.data.map((result, index) => {
            const x = padding.left + chart.xScale(index)
            return (
              <text
                key={result.year}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="fill-gray-600 text-xs"
              >
                Year {result.year}
              </text>
            )
          })}

          <g transform={chartTransform}>
            <path d={chart.area5090} fill="rgba(147, 197, 253, 0.3)" />
            <path d={chart.area2575} fill="rgba(59, 130, 246, 0.3)" />
            <path d={chart.p10Path} stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
            <path d={chart.p90Path} stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
            <path d={chart.p25Path} stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d={chart.p75Path} stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d={chart.p50Path} stroke={primary.color} strokeWidth="3" fill="none" />

            {chart.comparisonPaths.map((entry) => (
              <path
                key={entry.id}
                d={entry.path}
                stroke={entry.color}
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
              />
            ))}

            {chart.primaryPoints.map((point) => (
              <circle
                key={point.result.year}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={primary.color}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </g>
        </svg>
        <NPVHoverLayer points={chart.primaryPoints} primaryColor={primary.color} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6" style={{ backgroundColor: primary.color }}></div>
          <span className="text-gray-600">{primary.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-blue-500"></div>
          <span className="text-gray-600">p25-p75</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-blue-300"></div>
          <span className="text-gray-600">p10-p90</span>
        </div>
        {series.slice(1).map((entry) => (
          <div key={entry.id} className="flex items-center gap-2">
            <div className="h-0.5 w-6 border-t-2" style={{ borderColor: entry.color, borderStyle: "dashed" }}></div>
            <span className="text-gray-600">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

interface NPVHoverLayerProperties {
  points: Array<{
    result: YearlyResult
    x: number
    y: number
  }>
  primaryColor: string
}

const NPVHoverLayer = memo(function NPVHoverLayer({ points, primaryColor }: NPVHoverLayerProperties) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex]

  return (
    <>
      <svg className="pointer-events-none absolute top-0 left-0 w-full" viewBox={viewBox} aria-hidden="true">
        <g transform={chartTransform}>
          {hoveredPoint ? (
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={6} fill={primaryColor} stroke="white" strokeWidth="2" />
          ) : null}
          {points.map((point, index) => {
            const x = point.x - chartWidth / points.length / 2
            return (
              <rect
                key={point.result.year}
                x={x}
                y={0}
                width={chartWidth / points.length}
                height={chartHeight}
                fill="transparent"
                className="pointer-events-auto"
                onMouseEnter={() => {
                  setHoveredIndex(index)
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null)
                }}
              />
            )
          })}
        </g>
      </svg>

      {hoveredPoint ? (
        <div className="absolute top-4 right-4 rounded-xl border border-[var(--color-border-soft)] bg-white/90 p-3 text-xs shadow-md">
          <div className="font-semibold text-[var(--color-text-primary)]">Year {hoveredPoint.result.year}</div>
          <div className="mt-1 text-[var(--color-text-muted)]">
            Median:{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {formatAbbreviatedNumber(hoveredPoint.result.net.p50)}
            </span>
          </div>
          <div className="text-[var(--color-text-muted)]">
            p10 / p90: {formatAbbreviatedNumber(hoveredPoint.result.net.p10)} -{" "}
            {formatAbbreviatedNumber(hoveredPoint.result.net.p90)}
          </div>
        </div>
      ) : null}
    </>
  )
})
