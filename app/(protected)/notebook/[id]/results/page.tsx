"use client"

import { useNotebook } from "@/components/notebook/NotebookProvider"
import { ResultsTab } from "@/components/notebook/tabs/ResultsTab"

export default function ResultsPage() {
  const { simulationResult, scenarios, activeScenarioId, setActiveScenarioId, handleRenameScenario } = useNotebook()

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
