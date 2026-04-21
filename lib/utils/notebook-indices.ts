import type { Formula, Metric, Notebook } from "@/lib/types/notebook"

export type ReferenceableNotebookItem = Metric | Formula

export const buildReferenceableIds = (notebook: Pick<Notebook, "metrics" | "formulas">) => {
  const referenceableIds = new Map<string, ReferenceableNotebookItem>()

  for (const metric of notebook.metrics) {
    referenceableIds.set(metric.id, metric)
  }

  for (const formula of notebook.formulas) {
    referenceableIds.set(formula.id, formula)
  }

  return referenceableIds
}
