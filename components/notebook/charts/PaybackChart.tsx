"use client"

import type { SimulationStats } from "@/lib/types/notebook"

interface PaybackChartProperties {
  paybackPeriod: SimulationStats
}

export function PaybackChart({ paybackPeriod }: PaybackChartProperties) {
  const width = 600
  const height = 260
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxMonth = Math.max(12, Math.ceil(paybackPeriod.p90 * 1.15))
  const xScale = (month: number) => (month / maxMonth) * chartWidth
  const bandY = chartHeight / 2
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxMonth * ratio))

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Payback period percentile chart"
      >
        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Grid lines */}
        {ticks.map((month) => {
          const x = padding.left + xScale(month)
          return (
            <g key={month}>
              <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#f3f4f6" strokeWidth="1" />
              <text x={x} y={height - padding.bottom + 20} textAnchor="middle" className="fill-gray-600 text-xs">
                {month}
              </text>
            </g>
          )
        })}

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <line x1={0} y1={bandY} x2={chartWidth} y2={bandY} stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
          <line
            x1={xScale(paybackPeriod.p10)}
            y1={bandY}
            x2={xScale(paybackPeriod.p90)}
            y2={bandY}
            stroke="#93c5fd"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <line
            x1={xScale(paybackPeriod.p25)}
            y1={bandY}
            x2={xScale(paybackPeriod.p75)}
            y2={bandY}
            stroke="#3b82f6"
            strokeWidth="24"
            strokeLinecap="round"
          />

          {/* Median line */}
          <line
            x1={xScale(paybackPeriod.p50)}
            y1={bandY - 42}
            x2={xScale(paybackPeriod.p50)}
            y2={bandY + 42}
            stroke="#1e40af"
            strokeWidth="3"
          />

          <line
            x1={xScale(paybackPeriod.mean)}
            y1={bandY - 32}
            x2={xScale(paybackPeriod.mean)}
            y2={bandY + 32}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          <text
            x={xScale(paybackPeriod.p50)}
            y={bandY - 54}
            textAnchor="middle"
            className="fill-blue-900 text-xs font-semibold"
          >
            Median: {paybackPeriod.p50.toFixed(1)} months
          </text>
          <text
            x={xScale(paybackPeriod.mean)}
            y={bandY + 58}
            textAnchor="middle"
            className="fill-emerald-700 text-xs font-semibold"
          >
            Mean: {paybackPeriod.mean.toFixed(1)}
          </text>
          <text x={xScale(paybackPeriod.p10)} y={bandY + 38} textAnchor="middle" className="fill-gray-600 text-xs">
            p10
          </text>
          <text x={xScale(paybackPeriod.p90)} y={bandY + 38} textAnchor="middle" className="fill-gray-600 text-xs">
            p90
          </text>
        </g>

        {/* X-axis title */}
        <text x={width / 2} y={height - 10} textAnchor="middle" className="fill-gray-700 text-sm font-medium">
          Months to Payback
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-6 rounded bg-blue-300"></div>
          <span className="text-gray-600">p10-p90</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-6 rounded bg-blue-500"></div>
          <span className="text-gray-600">p25-p75</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-blue-900"></div>
          <span className="text-gray-600">Median</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-t-2 border-dashed border-emerald-600"></div>
          <span className="text-gray-600">Mean</span>
        </div>
      </div>
    </div>
  )
}
