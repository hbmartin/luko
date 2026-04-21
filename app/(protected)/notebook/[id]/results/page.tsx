"use client"

import { useNotebookActions, useNotebookSelector } from "@/components/notebook/NotebookProvider"
import { ResultsTab } from "@/components/notebook/tabs/ResultsTab"

export default function ResultsPage() {
  const simulationResult = useNotebookSelector((state) => state.simulationResult)
  const scenarios = useNotebookSelector((state) => state.scenarios)
  const activeScenarioId = useNotebookSelector((state) => state.activeScenarioId)
  const { handleRenameScenario, setActiveScenarioId } = useNotebookActions()

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
