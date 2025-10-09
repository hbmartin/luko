"use client"

import { ResultsTab } from "@/components/notebook/tabs/ResultsTab"
import { useNotebook } from "@/components/notebook/NotebookProvider"

export default function ResultsPage() {
  const {
    simulationResult,
    scenarios,
    activeScenarioId,
    setActiveScenarioId,
    handleRenameScenario,
  } = useNotebook()

  return (
    <ResultsTab
      simulationResult={simulationResult}
      scenarios={scenarios}
      activeScenarioId={activeScenarioId}
      onSelectScenario={setActiveScenarioId}
      onRenameScenario={handleRenameScenario}
    />
  )
}