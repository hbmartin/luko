import type { MentionDataItem } from "react-mentions-ts"
import type { Formula, Metric, Notebook } from "@/lib/types/notebook"

export type ReferenceableNotebookItem = Metric | Formula
export type MetricMentionExtra = Record<string, unknown> & {
  categoryId: Notebook["categories"][number]["id"]
  categoryName: Notebook["categories"][number]["name"]
  categoryType: Notebook["categories"][number]["type"]
  unit: Notebook["metrics"][number]["unit"]
  description?: Notebook["metrics"][number]["description"]
}
export type MetricMentionItem = MentionDataItem<MetricMentionExtra>

export const buildReferenceableIds = (
  notebook: Pick<Notebook, "metrics" | "formulas">
): ReadonlyMap<string, ReferenceableNotebookItem> => {
  const referenceableIds = new Map<string, ReferenceableNotebookItem>()

  for (const metric of notebook.metrics) {
    referenceableIds.set(metric.id, metric)
  }

  for (const formula of notebook.formulas) {
    referenceableIds.set(formula.id, formula)
  }

  return referenceableIds
}

export const buildMentionOptions = (notebook: Pick<Notebook, "categories" | "metrics">): MetricMentionItem[] => {
  const metricsByCategoryId = new Map<string, Notebook["metrics"]>()
  for (const metric of notebook.metrics) {
    const categoryMetrics = metricsByCategoryId.get(metric.categoryId)
    if (categoryMetrics) {
      categoryMetrics.push(metric)
    } else {
      metricsByCategoryId.set(metric.categoryId, [metric])
    }
  }

  return notebook.categories
    .toSorted((a, b) => a.order - b.order)
    .flatMap((category) =>
      (metricsByCategoryId.get(category.id) ?? []).map<MetricMentionItem>((metric) => ({
        id: metric.id,
        display: metric.name,
        categoryId: category.id,
        categoryName: category.name,
        categoryType: category.type,
        unit: metric.unit,
        description: metric.description,
      }))
    )
}
