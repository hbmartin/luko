"use client"

import { SimulationResult } from "@/lib/types/notebook"
import { NPVChart } from "../charts/NPVChart"
import { WaterfallChart } from "../charts/WaterfallChart"
import { TornadoChart } from "../charts/TornadoChart"
import { PaybackChart } from "../charts/PaybackChart"
import { formatAbbreviatedNumber, formatPercentage } from "@/lib/utils/grid-helpers"

interface ResultsTabProps {
  simulationResult: SimulationResult | null
}

export function ResultsTab({ simulationResult }: ResultsTabProps) {
  if (!simulationResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 size-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No simulation results</h3>
          <p className="mt-2 text-sm text-gray-500">
            Run a simulation from the Worksheet tab to see results
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Median NPV (3-Year)</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {formatAbbreviatedNumber(simulationResult.npv.p50)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Mean: {formatAbbreviatedNumber(simulationResult.npv.mean)}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">90% Confidence Interval</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {formatAbbreviatedNumber(simulationResult.npv.p10)} -{" "}
            {formatAbbreviatedNumber(simulationResult.npv.p90)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Std Dev: {formatAbbreviatedNumber(simulationResult.npv.std)}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Payback Period</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {simulationResult.paybackPeriod.p50.toFixed(1)} months
          </div>
          <div className="mt-1 text-xs text-green-600">Median estimate</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Simulation Details</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {simulationResult.metadata.iterations.toLocaleString()} iterations
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {simulationResult.metadata.calculationTimeMs}ms runtime
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* NPV Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">NPV Over Time</h3>
          <NPVChart data={simulationResult.yearlyResults} />
        </div>

        {/* Waterfall Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Category Contributions</h3>
          <WaterfallChart data={simulationResult.categoryContributions} />
        </div>

        {/* Tornado Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Sensitivity Analysis</h3>
          <TornadoChart data={simulationResult.sensitivityAnalysis} />
        </div>

        {/* Payback Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Payback Timeline</h3>
          <PaybackChart paybackPeriod={simulationResult.paybackPeriod} />
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>
            Simulation completed: {new Date(simulationResult.metadata.timestamp).toLocaleString()}
          </span>
          <span>Method: Monte Carlo (Beta PERT Distribution)</span>
        </div>
      </div>
    </div>
  )
}
