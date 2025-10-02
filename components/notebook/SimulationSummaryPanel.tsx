"use client"

import { Notebook } from "@/lib/types/notebook"

interface SimulationSummaryPanelProps {
  notebook: Notebook
}

export function SimulationSummaryPanel({ notebook }: SimulationSummaryPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Simulation Summary</h3>

      {!notebook.lastSimulationId ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
          <svg
            className="mx-auto mb-2 size-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="font-medium">No simulation run yet</p>
          <p className="mt-1 text-xs">
            Click &quot;Run Simulation&quot; to see results
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="text-xs font-medium text-blue-700">Median 3-Year NPV</div>
            <div className="mt-1 text-2xl font-bold text-blue-900">$1.85M</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payback Period</span>
              <span className="font-medium text-gray-900">4.2 months</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ROI</span>
              <span className="font-medium text-green-600">356%</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="mb-2 text-xs font-medium text-gray-700">Confidence Intervals</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">90th percentile</span>
                <span className="font-medium">$2.4M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">75th percentile</span>
                <span className="font-medium">$2.1M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">25th percentile</span>
                <span className="font-medium">$1.5M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">10th percentile</span>
                <span className="font-medium">$1.2M</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {notebook.isDirty && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 size-4 shrink-0 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-xs">
              <p className="font-medium text-yellow-800">Parameters changed</p>
              <p className="mt-1 text-yellow-700">
                {notebook.dirtyMetrics.length} metric{notebook.dirtyMetrics.length !== 1 ? "s" : ""}{" "}
                modified since last run
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
