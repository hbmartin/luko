"use client"

import { useNotebookActions, useNotebookSelector } from "@/components/notebook/NotebookProvider"
import { WorksheetTab } from "@/components/notebook/tabs/WorksheetTab"

export default function WorksheetPage() {
  const notebook = useNotebookSelector((state) => state.notebook)
  const density = useNotebookSelector((state) => state.density)
  const simulationResult = useNotebookSelector((state) => state.simulationResult)
  const { setNotebook } = useNotebookActions()

  return (
    <WorksheetTab
      notebook={notebook}
      onNotebookChange={setNotebook}
      density={density}
      simulationResult={simulationResult}
    />
  )
}
