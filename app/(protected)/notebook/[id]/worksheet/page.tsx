"use client"

import { useNotebook } from "@/components/notebook/NotebookProvider"
import { WorksheetTab } from "@/components/notebook/tabs/WorksheetTab"

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
