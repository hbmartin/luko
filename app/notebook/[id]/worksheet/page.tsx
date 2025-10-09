"use client"

import { WorksheetTab } from "@/components/notebook/tabs/WorksheetTab"
import { useNotebook } from "@/components/notebook/NotebookProvider"

export default function WorksheetPage() {
  const { notebook, setNotebook, density, simulationResult } = useNotebook()

  return (
    <WorksheetTab
      notebook={notebook}
      onNotebookChange={setNotebook}
      density={density}
      simulationResult={simulationResult}
    />
  )
}