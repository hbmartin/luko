import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  notebookCategories,
  NotebookCategoryRecord,
  notebookFormulas,
  NotebookFormulaRecord,
  notebookMetrics,
  NotebookMetricRecord,
  notebooks,
  NotebookRecord,
} from "@/lib/db/schema"
import {
  Category,
  CategoryType,
  CategoryTypeSchema,
  Distribution,
  DistributionSchema,
  Formula,
  Metric,
  Notebook,
  UnitType,
  UnitTypeSchema,
} from "@/lib/types/notebook"

type DirtyFieldsPayload = {
  metrics?: string[]
  formulas?: string[]
}

const parseCategoryType = (value?: string | null): CategoryType => {
  if (!value) return "facts"
  const parsed = CategoryTypeSchema.safeParse(value)
  if (parsed.success) return parsed.data
  return "facts"
}

const parseDistribution = (value: NotebookMetricRecord["distribution"]): Distribution | null => {
  if (!value) return null
  const parsed = DistributionSchema.partial().safeParse(value)
  if (!parsed.success) return null
  const sanitized = parsed.data
  if (sanitized.min === undefined && sanitized.mode === undefined && sanitized.max === undefined) {
    return null
  }
  return sanitized as Distribution
}

const parseUnit = (value: NotebookMetricRecord["unit"]): UnitType => {
  if (!value) return "dimensionless"
  const parsed = UnitTypeSchema.safeParse(value)
  return parsed.success ? parsed.data : "dimensionless"
}

const parseNumericValue = (value: NotebookMetricRecord["value"]): number | undefined => {
  if (value === null || value === undefined) return undefined
  const numeric = typeof value === "string" ? Number(value) : value
  return Number.isFinite(numeric) ? numeric : undefined
}

const parseDirtyIds = (payload: DirtyFieldsPayload | null | undefined, key: keyof DirtyFieldsPayload): string[] => {
  if (!payload) return []
  const value = payload[key]
  if (!value) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

const mapCategory = (record: NotebookCategoryRecord): Category => ({
  id: record.id,
  name: record.name,
  description: record.description ?? undefined,
  type: parseCategoryType(record.timePeriod),
  order: record.orderIndex,
  isExpanded: true,
  totalFormula: record.totalFormulaId ?? undefined,
})

const mapMetric = (record: NotebookMetricRecord): Metric => ({
  id: record.id,
  name: record.name,
  description: record.description ?? undefined,
  unit: parseUnit(record.unit),
  distribution: parseDistribution(record.distribution),
  value: parseNumericValue(record.value),
  categoryId: record.categoryId,
})

const mapFormula = (record: NotebookFormulaRecord): Formula => ({
  id: record.id,
  name: record.name,
  categoryId: record.categoryId,
  description: undefined,
  expression: record.expression,
  updatedAt: record.updatedAt,
})

const mapNotebook = (
  base: NotebookRecord,
  categories: NotebookCategoryRecord[],
  metrics: NotebookMetricRecord[],
  formulas: NotebookFormulaRecord[]
): Notebook => {
  const dirtyFieldsValue = base.dirtyFields
  const dirtyPayload =
    dirtyFieldsValue && typeof dirtyFieldsValue === "object" && !Array.isArray(dirtyFieldsValue)
      ? (dirtyFieldsValue as DirtyFieldsPayload)
      : null

  return {
    id: base.id,
    name: base.name,
    description: base.description ?? undefined,
    categories: categories.map(mapCategory),
    metrics: metrics.map(mapMetric),
    formulas: formulas.map(mapFormula),
    lastSimulationId: base.lastSimulationId,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    isDirty: base.isDirty,
    dirtyMetrics: parseDirtyIds(dirtyPayload, "metrics"),
    dirtyFormulas: parseDirtyIds(dirtyPayload, "formulas"),
  }
}

export async function getNotebookById(notebookId: string): Promise<Notebook | null> {
  const notebook = await db.query.notebooks.findFirst({
    where: eq(notebooks.id, notebookId),
  })

  if (!notebook) {
    return null
  }

  const [categories, metrics, formulas] = await Promise.all([
    db.query.notebookCategories.findMany({
      where: eq(notebookCategories.notebookId, notebook.id),
      orderBy: asc(notebookCategories.orderIndex),
    }),
    db.query.notebookMetrics.findMany({
      where: eq(notebookMetrics.notebookId, notebook.id),
      orderBy: asc(notebookMetrics.orderIndex),
    }),
    db.query.notebookFormulas.findMany({
      where: eq(notebookFormulas.notebookId, notebook.id),
      orderBy: asc(notebookFormulas.updatedAt),
    }),
  ])

  return mapNotebook(notebook, categories, metrics, formulas)
}
