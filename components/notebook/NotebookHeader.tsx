"use client"

import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { formatAbbreviatedNumber } from "@/lib/utils/grid-helpers"

interface NotebookHeaderProps {
  notebook: Notebook
  simulationResult: SimulationResult | null
  onRunSimulation: () => void
  isSimulating: boolean
}

export function NotebookHeader({
  notebook,
  simulationResult,
  onRunSimulation,
  isSimulating,
}: NotebookHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-[1600px] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and metadata */}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">{notebook.name}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              {simulationResult && (
                <>
                  <span>
                    Last run: {new Date(simulationResult.metadata.timestamp).toLocaleString()}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium text-gray-700">
                    Median NPV: {formatAbbreviatedNumber(simulationResult.npv.p50)}
                  </span>
                </>
              )}
              {!simulationResult && <span>No simulation run yet</span>}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {notebook.isDirty && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                {notebook.dirtyMetrics.length} unsaved change
                {notebook.dirtyMetrics.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className={`
                rounded-md px-4 py-2 text-sm font-medium text-white transition-colors
                ${
                  isSimulating
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              `}
            >
              {isSimulating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Running Simulation...
                </span>
              ) : (
                "Run Simulation"
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
