import { parseFormula } from "@/lib/formulas"
import { Formula, Metric, Notebook } from "@/lib/types/notebook"

export type MetricValidationFieldErrors = {
  min?: string
  mode?: string
  max?: string
  value?: string
}

export interface MetricValidationResult {
  summary?: string
  fields: MetricValidationFieldErrors
}

const summarizeMetricFieldErrors = (fields: MetricValidationFieldErrors): string | undefined => {
  const parts: string[] = []
  if (fields.min) parts.push(`Min: ${fields.min}`)
  if (fields.mode) parts.push(`Most likely: ${fields.mode}`)
  if (fields.max) parts.push(`Max: ${fields.max}`)
  if (fields.value) parts.push(`Value: ${fields.value}`)
  if (parts.length === 0) return undefined
  return parts.join(" • ")
}

export const validateMetric = (metric: Metric): MetricValidationResult | undefined => {
  if (!metric.distribution) return undefined

  const { min, mode, max } = metric.distribution
  const fields: MetricValidationFieldErrors = {}

  if (min === undefined || Number.isNaN(min)) {
    fields.min = "Required"
  }
  if (mode === undefined || Number.isNaN(mode)) {
    fields.mode = "Required"
  }
  if (max === undefined || Number.isNaN(max)) {
    fields.max = "Required"
  }

  if (fields.min || fields.mode || fields.max) {
    return {
      fields,
      summary: summarizeMetricFieldErrors(fields),
    }
  }

  if (min > mode) {
    fields.min = "Min must be ≤ Most likely"
  }
  if (mode > max) {
    fields.max = "Max must be ≥ Most likely"
  }
  if (min > max) {
    fields.min = "Min must be ≤ Max"
    fields.max = "Max must be ≥ Min"
  }

  if (Object.keys(fields).length === 0) {
    return undefined
  }

  return {
    fields,
    summary: summarizeMetricFieldErrors(fields),
  }
}

export const validateFormula = (formula: Formula, _notebook: Notebook): string | undefined => {
  const expression = formula.expression.trim()
  if (!expression) {
    return "Start by selecting a metric"
  }

  // TODO: check for missing references once identifiers are available in notebook context

  try {
    parseFormula(expression)
    return undefined
  } catch (error) {
    console.error(error)
    return error instanceof Error ? error.message : "Formula is invalid"
  }
}

export const applyNotebookValidations = (notebook: Notebook): Notebook => {
  let metricsChanged = false
  const mapMetricWithValidation = (metric: Metric): Metric => {
    const validation = validateMetric(metric)

    if (!validation) {
      if (metric.validation === undefined) {
        return metric
      }
      const nextMetric: Metric = { ...metric }
      delete nextMetric.validation
      metricsChanged = true
      return nextMetric
    }

    const existing = metric.validation
    if (
      existing &&
      existing.summary === validation.summary &&
      existing.fields?.min === validation.fields.min &&
      existing.fields?.mode === validation.fields.mode &&
      existing.fields?.max === validation.fields.max &&
      existing.fields?.value === validation.fields.value
    ) {
      return metric
    }

    metricsChanged = true
    return {
      ...metric,
      validation,
    }
  }

  const metrics = notebook.metrics.map(mapMetricWithValidation)

  let formulasChanged = false
  const mapFormulaWithValidation = (formula: Formula): Formula => {
    const error = validateFormula(formula, notebook)
    if (error === undefined) {
      if (formula.error === undefined) {
        return formula
      }
      const nextFormula: Formula = { ...formula }
      delete nextFormula.error
      formulasChanged = true
      return nextFormula
    }

    if (formula.error === error) {
      return formula
    }

    formulasChanged = true
    return {
      ...formula,
      error,
    }
  }
  const formulas = notebook.formulas.map(mapFormulaWithValidation)

  if (!metricsChanged && !formulasChanged) {
    return notebook
  }

  return {
    ...notebook,
    metrics: metricsChanged ? metrics : notebook.metrics,
    formulas: formulasChanged ? formulas : notebook.formulas,
  }
}
