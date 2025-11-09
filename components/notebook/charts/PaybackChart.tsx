"use client"

interface PaybackChartProperties {
  paybackPeriod: {
    p50: number // in months
  }
}

export function PaybackChart({ paybackPeriod }: PaybackChartProperties) {
  const width = 600
  const height = 300
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Generate mock distribution data around the median
  // In a real implementation, this would come from the simulation
  const months = Array.from({ length: 24 }, (_, index) => index + 1)
  const median = paybackPeriod.p50

  // Create a normal-ish distribution around the median
  const distribution = months.map((month) => {
    const distance = Math.abs(month - median)
    const probability = Math.exp(-Math.pow(distance / 2, 2)) * 100
    return { month, probability }
  })

  const maxProbability = Math.max(...distribution.map((d) => d.probability))

  // Scaling functions
  const barWidth = chartWidth / months.length
  const xScale = (index: number) => index * barWidth
  const yScale = (value: number) => chartHeight - (value / maxProbability) * chartHeight

  // Calculate cumulative probability curve
  let cumulative = 0
  const cumulativeData = distribution.map((d) => {
    cumulative += d.probability / 100
    return { month: d.month, cumulative: Math.min(cumulative / 5, 1) } // normalized
  })

  const cumulativePath = cumulativeData
    .map((d, index) => {
      const x = xScale(index) + barWidth / 2
      const y = chartHeight - d.cumulative * chartHeight
      return index === 0 ? `M ${x},${y}` : `L ${x},${y}`
    })
    .join(" ")

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

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + chartHeight - t * chartHeight
          return (
            <line key={t} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
          )
        })}

        {/* Bars (histogram) */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {distribution.map((d, index) => {
            const x = xScale(index)
            const barH = chartHeight - yScale(d.probability)
            const isMedian = Math.abs(d.month - median) < 0.5

            return (
              <rect
                key={index}
                x={x}
                y={yScale(d.probability)}
                width={barWidth * 0.9}
                height={barH}
                fill={isMedian ? "#1e40af" : "#93c5fd"}
                opacity="0.8"
              />
            )
          })}

          {/* Median line */}
          <line
            x1={xScale(median - 1) + barWidth / 2}
            y1={0}
            x2={xScale(median - 1) + barWidth / 2}
            y2={chartHeight}
            stroke="#1e40af"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Median label */}
          <text
            x={xScale(median - 1) + barWidth / 2}
            y={-10}
            textAnchor="middle"
            className="fill-blue-900 text-xs font-semibold"
          >
            Median: {median.toFixed(1)} months
          </text>

          {/* Cumulative probability curve */}
          <path d={cumulativePath} stroke="#10b981" strokeWidth="2" fill="none" opacity="0.8" />
        </g>

        {/* X-axis labels (every 3 months) */}
        {months
          .filter((m) => m % 3 === 0)
          .map((month) => {
            const x = padding.left + xScale(month - 1) + barWidth / 2
            return (
              <text
                key={month}
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="fill-gray-600 text-xs"
              >
                {month}
              </text>
            )
          })}

        {/* X-axis title */}
        <text x={width / 2} y={height - 10} textAnchor="middle" className="fill-gray-700 text-sm font-medium">
          Months to Payback
        </text>

        {/* Y-axis title */}
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className="fill-gray-700 text-sm font-medium"
        >
          Probability
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-3 bg-blue-300"></div>
          <span className="text-gray-600">Probability Distribution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 bg-green-500"></div>
          <span className="text-gray-600">Cumulative Probability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-t-2 border-dashed border-blue-900"></div>
          <span className="text-gray-600">Median</span>
        </div>
      </div>
    </div>
  )
}
