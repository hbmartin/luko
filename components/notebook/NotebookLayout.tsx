"use client"

import { useState } from "react"
import { Notebook, SimulationResult } from "@/lib/types/notebook"
import { NotebookHeader } from "./NotebookHeader"
import { WorksheetTab } from "./tabs/WorksheetTab"
import { ResultsTab } from "./tabs/ResultsTab"
import { ExportTab } from "./tabs/ExportTab"
import { mockSimulationResult } from "@/lib/mock-data"

interface NotebookLayoutProps {
  notebook: Notebook
}

type TabType = "worksheet" | "results" | "export"

export function NotebookLayout({ notebook: initialNotebook }: NotebookLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("worksheet")
  const [notebook, setNotebook] = useState<Notebook>(initialNotebook)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const handleRunSimulation = async () => {
    setIsSimulating(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Set mock results
    setSimulationResult(mockSimulationResult)
    setNotebook((prev) => ({
      ...prev,
      isDirty: false,
      dirtyMetrics: [],
      lastSimulationId: "sim-1",
    }))

    setIsSimulating(false)

    // Switch to results tab
    setActiveTab("results")
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <NotebookHeader
        notebook={notebook}
        simulationResult={simulationResult}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-[1600px] px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("worksheet")}
            className={`
              border-b-2 px-6 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "worksheet"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }
            `}
          >
            Worksheet
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`
              border-b-2 px-6 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "results"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }
            `}
            disabled={!simulationResult}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`
              border-b-2 px-6 py-3 text-sm font-medium transition-colors
              ${
                activeTab === "export"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }
            `}
          >
            Export
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "worksheet" && (
          <WorksheetTab notebook={notebook} onNotebookChange={setNotebook} />
        )}
        {activeTab === "results" && <ResultsTab simulationResult={simulationResult} />}
        {activeTab === "export" && <ExportTab />}
      </main>
    </div>
  )
}
