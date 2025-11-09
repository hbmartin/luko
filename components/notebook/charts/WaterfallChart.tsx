"use client"

import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

interface CategoryContribution {
  categoryId: string
  categoryName: string
  contribution: number
  percentage: number
}

interface WaterfallChartProperties {
  data: CategoryContribution[]
}

export function WaterfallChart({ data }: WaterfallChartProperties) {
  const width = 600
  const height = 400
  const padding = { top: 20, right: 40, bottom: 120, left: 80 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate cumulative values for waterfall
  let cumulative = 0
  const waterfallData = data.map((item) => {
    const start = cumulative
    cumulative += item.contribution
    const end = cumulative
    return {
      ...item,
      start,
      end,
      isPositive: item.contribution >= 0,
    }
  })

  // Add total bar
  const total = cumulative
  waterfallData.push({
    categoryId: "total",
    categoryName: "Total NPV",
    contribution: total,
    percentage: 100,
    start: 0,
    end: total,
    isPositive: total >= 0,
  })

  // Find min and max for scaling
  const allValues = waterfallData.flatMap((d) => [d.start, d.end])
  const minValue = Math.min(0, ...allValues)
  const maxValue = Math.max(...allValues)

  // Scaling functions
  const barWidth = chartWidth / (waterfallData.length + 1)
  const xScale = (index: number) => index * barWidth + barWidth / 2
  const yScale = (value: number) => {
    return chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight
  }

  const zeroY = yScale(0)

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

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={padding.top + zeroY}
          x2={width - padding.right}
          y2={padding.top + zeroY}
          stroke="#9ca3af"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Y-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const value = minValue + t * (maxValue - minValue)
          const y = padding.top + chartHeight - t * chartHeight
          return (
            <g key={t}>
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

        {/* Bars and connectors */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {waterfallData.map((item, index) => {
            const x = xScale(index)
            const barW = barWidth * 0.7
            const y1 = yScale(item.start)
            const y2 = yScale(item.end)
            const barHeight = Math.abs(y2 - y1)
            const barY = Math.min(y1, y2)

            const isTotal = item.categoryId === "total"
            const color = isTotal ? "#1e40af" : item.isPositive ? "#10b981" : "#ef4444"

            return (
              <g key={index}>
                {/* Connector line to previous bar */}
                {index > 0 && !isTotal && (
                  <line
                    x1={xScale(index - 1) + barW / 2}
                    y1={yScale(waterfallData[index - 1]!.end)}
                    x2={x - barW / 2}
                    y2={yScale(item.start)}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Bar */}
                <rect x={x - barW / 2} y={barY} width={barW} height={barHeight} fill={color} opacity="0.8" rx="2" />

                {/* Value label */}
                <text x={x} y={barY - 5} textAnchor="middle" className="fill-gray-700 text-xs font-medium">
                  {formatAbbreviatedNumber(item.contribution)}
                </text>

                {/* Category label */}
                <text
                  x={x}
                  y={chartHeight + 10}
                  textAnchor="end"
                  transform={`rotate(-45, ${x}, ${chartHeight + 10})`}
                  className="fill-gray-600 text-xs"
                >
                  {item.categoryName.length > 25 ? item.categoryName.slice(0, 25) + "..." : item.categoryName}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded bg-green-500"></div>
          <span className="text-gray-600">Benefits</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded bg-red-500"></div>
          <span className="text-gray-600">Costs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded bg-blue-900"></div>
          <span className="text-gray-600">Total NPV</span>
        </div>
      </div>
    </div>
  )
}
