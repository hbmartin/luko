"use client"

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

interface NPVChartProps {
  data: YearlyResult[]
}

export function NPVChart({ data }: NPVChartProps) {
  const width = 600
  const height = 300
  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Find min and max values for scaling
  const allValues = data.flatMap((d) => [d.net.p10, d.net.p90])
  const minValue = Math.min(0, ...allValues)
  const maxValue = Math.max(...allValues)

  // Scaling functions
  const xScale = (year: number) => (year / data.length) * chartWidth
  const yScale = (value: number) => {
    return chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight
  }

  // Create path strings for each percentile
  const createPath = (getValue: (d: YearlyResult) => number) => {
    return data
      .map((d, i) => {
        const x = xScale(i + 1)
        const y = yScale(getValue(d))
        return i === 0 ? `M ${x},${y}` : `L ${x},${y}`
      })
      .join(" ")
  }

  const p50Path = createPath((d) => d.net.p50)
  const p25Path = createPath((d) => d.net.p25)
  const p75Path = createPath((d) => d.net.p75)
  const p10Path = createPath((d) => d.net.p10)
  const p90Path = createPath((d) => d.net.p90)

  // Create confidence interval areas
  const createArea = (
    getUpper: (d: YearlyResult) => number,
    getLower: (d: YearlyResult) => number,
  ) => {
    const upperPath = data.map((d, i) => `${xScale(i + 1)},${yScale(getUpper(d))}`).join(" ")
    const lowerPath = data
      .map((d, i) => `${xScale(i + 1)},${yScale(getLower(d))}`)
      .reverse()
      .join(" ")
    return `M ${upperPath} L ${lowerPath} Z`
  }

  const area5090 = createArea(
    (d) => d.net.p90,
    (d) => d.net.p10,
  )
  const area2575 = createArea(
    (d) => d.net.p75,
    (d) => d.net.p25,
  )

  // Y-axis ticks
  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return minValue + (i * (maxValue - minValue)) / (yTicks - 1)
  })

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Y-axis grid lines and labels */}
        {yTickValues.map((value, i) => {
          const y = padding.top + yScale(value)
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
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

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding.left + xScale(i + 1)
          return (
            <text
              key={i}
              x={x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="fill-gray-600 text-xs"
            >
              Year {d.year}
            </text>
          )
        })}

        {/* Confidence intervals */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* 10-90 percentile area */}
          <path d={area5090} fill="#dbeafe" opacity="0.5" />

          {/* 25-75 percentile area */}
          <path d={area2575} fill="#93c5fd" opacity="0.5" />

          {/* Percentile lines */}
          <path d={p10Path} stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
          <path d={p90Path} stroke="#60a5fa" strokeWidth="1" fill="none" opacity="0.5" />
          <path d={p25Path} stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d={p75Path} stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.7" />

          {/* Median line (bold) */}
          <path d={p50Path} stroke="#1e40af" strokeWidth="3" fill="none" />

          {/* Data points */}
          {data.map((d, i) => {
            const x = xScale(i + 1)
            const y = yScale(d.net.p50)
            return (
              <circle key={i} cx={x} cy={y} r="4" fill="#1e40af" stroke="white" strokeWidth="2" />
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-blue-900"></div>
          <span className="text-gray-600">Median (p50)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-blue-500"></div>
          <span className="text-gray-600">p25-p75</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-blue-300"></div>
          <span className="text-gray-600">p10-p90</span>
        </div>
      </div>
    </div>
  )
}
