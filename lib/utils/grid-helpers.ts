import { Formula, FormulaRow, GridRow, Metric, MetricRow, Notebook } from "@/lib/types/notebook"

/**
 * Converts notebook data to flattened grid rows for react-data-grid
 * Includes both categories and their metrics in a hierarchical structure
 */
export function notebookToGridRows(notebook: Notebook): GridRow[] {
  const rows: GridRow[] = []

  // Sort categories by order
  const sortedCategories = [...notebook.categories].sort((a, b) => a.order - b.order)

  sortedCategories.forEach((category) => {
    // Add category row
    // rows.push({
    //   id: category.id,
    //   type: "category",
    //   name: category.name,
    //   isExpanded: category.isExpanded,
    //   level: 0,
    //   depth: 0,
    //   description: category.description,
    // })

    // Add metric rows if category is expanded
    // if (category.isExpanded) {
    const categoryMetrics = notebook.metrics.filter((m) => m.categoryId === category.id)

    categoryMetrics.forEach((metric) => {
      rows.push(metricToGridRow(metric, notebook.dirtyMetrics))
    })

    const categoryFormulas = notebook.formulas.filter((formula) => formula.categoryId === category.id)
    categoryFormulas.forEach((formula) => {
      rows.push(formulaToGridRow(formula, notebook.dirtyFormulas))
    })
    // }
  })

  return rows
}

/**
 * Converts a single metric to a grid row
 */
export function metricToGridRow(metric: Metric, dirtyMetrics: string[]): MetricRow {
  return {
    id: metric.id,
    type: "metric",
    name: metric.name,
    unit: metric.unit,
    min: metric.distribution?.min ?? null,
    mode: metric.distribution?.mode ?? null,
    max: metric.distribution?.max ?? null,
    categoryId: metric.categoryId,
    isDirty: dirtyMetrics.includes(metric.id),
    description: metric.description,
  }
}

export function formulaToGridRow(formula: Formula, dirtyFormulas: string[]): FormulaRow {
  return {
    id: formula.id,
    type: "formula",
    name: formula.name,
    tokens: formula.tokens,
    categoryId: formula.categoryId,
    isDirty: dirtyFormulas.includes(formula.id),
  }
}

/**
 * Formats a number for display
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return ""
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formats currency
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formats large numbers with abbreviations (K, M, B)
 */
export function formatAbbreviatedNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`
  }
  return formatCurrency(value)
}

/**
 * Formats percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return `${(value * 100).toFixed(1)}%`
}
