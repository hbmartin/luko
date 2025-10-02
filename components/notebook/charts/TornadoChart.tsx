"use client"

interface SensitivityItem {
  metricId: string
  metricName: string
  impact: number // correlation coefficient, can be negative
}

interface TornadoChartProps {
  data: SensitivityItem[]
}

export function TornadoChart({ data }: TornadoChartProps) {
  const width = 600
  const height = 400
  const padding = { top: 20, right: 60, bottom: 40, left: 200 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Sort by absolute impact (largest first)
  const sortedData = [...data].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))

  const barHeight = chartHeight / (sortedData.length + 1)
  const maxImpact = Math.max(...sortedData.map((d) => Math.abs(d.impact)))

  // Scaling function
  const xScale = (value: number) => (Math.abs(value) / maxImpact) * (chartWidth / 2)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Center line */}
        <line
          x1={padding.left + chartWidth / 2}
          y1={padding.top}
          x2={padding.left + chartWidth / 2}
          y2={height - padding.bottom}
          stroke="#9ca3af"
          strokeWidth="2"
        />

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - padding.bottom + 25}
          textAnchor="start"
          className="fill-gray-600 text-xs"
        >
          Negative Impact
        </text>
        <text
          x={width - padding.right}
          y={height - padding.bottom + 25}
          textAnchor="end"
          className="fill-gray-600 text-xs"
        >
          Positive Impact
        </text>

        {/* Bars */}
        {sortedData.map((item, i) => {
          const y = padding.top + i * barHeight + barHeight / 2
          const barW = xScale(item.impact)
          const centerX = padding.left + chartWidth / 2

          const isPositive = item.impact >= 0
          const barX = isPositive ? centerX : centerX - barW
          const color = isPositive ? "#10b981" : "#ef4444"

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={barX}
                y={y - barHeight * 0.35}
                width={barW}
                height={barHeight * 0.7}
                fill={color}
                opacity="0.8"
                rx="2"
              />

              {/* Metric name label (left side) */}
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="fill-gray-700 text-xs"
              >
                {item.metricName.length > 30
                  ? item.metricName.substring(0, 30) + "..."
                  : item.metricName}
              </text>

              {/* Impact value label */}
              <text
                x={isPositive ? barX + barW + 5 : barX - 5}
                y={y}
                textAnchor={isPositive ? "start" : "end"}
                alignmentBaseline="middle"
                className="fill-gray-700 text-xs font-medium"
              >
                {(item.impact * 100).toFixed(0)}%
              </text>
            </g>
          )
        })}

        {/* Y-axis title */}
        <text
          x={padding.left - 180}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${padding.left - 180}, ${height / 2})`}
          className="fill-gray-700 text-sm font-medium"
        >
          Input Metrics
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-600">
        <p>
          <strong>Impact:</strong> Correlation coefficient showing how changes in each metric
          affect NPV
        </p>
      </div>
    </div>
  )
}
