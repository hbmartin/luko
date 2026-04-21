/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { compileNotebookFormulas, evaluateFormulas } from "@/lib/formulas"
import { Category, Metric, Notebook, SimulationResult } from "@/lib/types/notebook"

const DEFAULT_ITERATIONS = 100_000
const SIMULATION_YEAR_COUNT = 3
const SIMULATION_YIELD_INTERVAL = 500

const sampleGamma = (alpha: number): number => {
  if (alpha < 1) {
    const u = Math.random()
    return sampleGamma(alpha + 1) * Math.pow(u, 1 / alpha)
  }

  const d = alpha - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  while (true) {
    let x: number
    let v: number

    do {
      x = normalSample()
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = Math.random()

    if (u < 1 - 0.331 * Math.pow(x, 4)) {
      return d * v
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v
    }
  }
}

const normalSample = () => {
  const u1 = Math.max(Math.random(), Number.EPSILON)
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

const samplePert = (min: number, mode: number, max: number): number => {
  if (min === max) return min
  const alpha = 1 + 4 * ((mode - min) / (max - min))
  const beta = 1 + 4 * ((max - mode) / (max - min))
  const betaSample = sampleGamma(alpha) / (sampleGamma(alpha) + sampleGamma(beta))
  return min + betaSample * (max - min)
}

const quantile = (sortedValues: number[], q: number): number => {
  if (sortedValues.length === 0) return 0
  const index = (sortedValues.length - 1) * q
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]!
  const weight = index - lower
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight
}

const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((accumulator, value) => accumulator + value, 0) / values.length : 0

const stddev = (values: number[]) => {
  if (values.length <= 1) return 0
  const avg = mean(values)
  const variance =
    values.reduce((accumulator, value) => accumulator + Math.pow(value - avg, 2), 0) / (values.length - 1)
  return Math.sqrt(variance)
}

const isFinancialMetric = (metric: Metric) => metric.unit?.includes("$")

const assertFinite = (value: number, label: string) => {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`)
  }
}

const sampleMetricValue = (metric: Metric): number => {
  if (!metric.distribution) {
    const value = metric.value ?? 0
    assertFinite(value, metric.name)
    return value
  }

  const { min, mode, max } = metric.distribution
  if (min === undefined || mode === undefined || max === undefined) {
    throw new Error(`Distribution for ${metric.name} must include min, mode, and max.`)
  }
  assertFinite(min, `${metric.name} min`)
  assertFinite(mode, `${metric.name} most likely`)
  assertFinite(max, `${metric.name} max`)

  if (min > mode || mode > max) {
    throw new Error(`Distribution for ${metric.name} must satisfy min <= mode <= max.`)
  }

  return samplePert(min, mode, max)
}

const fallbackCategoryOutput = (
  category: Category,
  metrics: Metric[],
  evaluatedValues: Record<string, number>,
  sampledValues: Record<string, number>
) => {
  return metrics
    .filter((metric) => metric.categoryId === category.id)
    .reduce((accumulator, metric) => {
      const value = evaluatedValues[metric.id] ?? sampledValues[metric.id] ?? 0
      if (!isFinancialMetric(metric)) return accumulator
      return accumulator + value
    }, 0)
}

const getCategoryOutput = (
  category: Category,
  metrics: Metric[],
  evaluatedValues: Record<string, number>,
  sampledValues: Record<string, number>
) => {
  if (category.type === "facts") return 0

  if (category.outputFormulaId) {
    const value = evaluatedValues[category.outputFormulaId]
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Category ${category.name} output formula could not be evaluated.`)
    }
    return value
  }

  return fallbackCategoryOutput(category, metrics, evaluatedValues, sampledValues)
}

const normalizeFormulaKey = (value: string) => value.toLowerCase().replaceAll(/[\s-]+/g, "_")

const getEvaluatedFormulaNumber = (evaluatedValues: Record<string, number>, formulaId: string) => {
  const value = evaluatedValues[formulaId]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const findYearFormulaId = (notebook: Notebook, year: number, term: string) => {
  const yearKey = String(year)
  const normalizedCandidates = new Set([
    `formula_year_${yearKey}_${term}`,
    `year_${yearKey}_${term}`,
    `formula_year_${yearKey}_${term}_cash_flow`,
    `year_${yearKey}_${term}_cash_flow`,
  ])

  const formulaById = notebook.formulas.find((formula) => normalizedCandidates.has(normalizeFormulaKey(formula.id)))
  if (formulaById) {
    return formulaById.id
  }

  const normalizedNameCandidates = new Set([
    `year_${yearKey}_${term}`,
    `year_${yearKey}_${term}_cash_flow`,
    `year_${yearKey}_${term}_cashflow`,
  ])

  return notebook.formulas.find((formula) => normalizedNameCandidates.has(normalizeFormulaKey(formula.name)))?.id
}

const getExplicitYearNetFormulaIds = (notebook: Notebook) =>
  Array.from({ length: SIMULATION_YEAR_COUNT }, (_value, index) => findYearFormulaId(notebook, index + 1, "net"))

const getExplicitYearNetValues = (
  explicitYearNetFormulaIds: Array<string | undefined>,
  evaluatedValues: Record<string, number>
) =>
  explicitYearNetFormulaIds.map((formulaId) =>
    formulaId ? getEvaluatedFormulaNumber(evaluatedValues, formulaId) : undefined
  )

const createYearlyCashFlows = (
  explicitYearNetFormulaIds: Array<string | undefined>,
  evaluatedValues: Record<string, number>,
  totalBenefits: number,
  totalCosts: number
) => {
  const explicitYearNetValues = getExplicitYearNetValues(explicitYearNetFormulaIds, evaluatedValues)

  return explicitYearNetValues.map((netValue) => {
    if (typeof netValue === "number") {
      const costs = totalBenefits - netValue
      return {
        benefits: totalBenefits,
        costs,
        net: netValue,
      }
    }

    return {
      benefits: totalBenefits,
      costs: totalCosts,
      net: totalBenefits - totalCosts,
    }
  })
}

const correlation = (x: number[], y: number[]) => {
  if (x.length === 0 || x.length !== y.length) return 0
  const meanX = mean(x)
  const meanY = mean(y)
  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (const [index, element] of x.entries()) {
    const dx = element - meanX
    const dy = y[index]! - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)
  return denominator === 0 ? 0 : numerator / denominator
}

interface MetricSampleTrack {
  metric: Metric
  values: number[]
}

const yieldToEventLoop = () =>
  new Promise<void>((resolve) => {
    if (typeof globalThis.setImmediate === "function") {
      globalThis.setImmediate(resolve)
      return
    }

    globalThis.setTimeout(resolve, 0)
  })

export async function runSimulation(
  notebook: Notebook,
  iterations: number = DEFAULT_ITERATIONS
): Promise<SimulationResult> {
  const registry = compileNotebookFormulas(notebook)
  const explicitYearNetFormulaIds = getExplicitYearNetFormulaIds(notebook)
  const metricSamples: Record<string, MetricSampleTrack> = {}
  const categorySamples: Record<string, number[]> = {}
  const yearlyBenefitsSamples = Array.from({ length: 3 }, () => [] as number[])
  const yearlyCostsSamples = Array.from({ length: 3 }, () => [] as number[])
  const yearlyNetSamples = Array.from({ length: 3 }, () => [] as number[])
  const npvSamples: number[] = []
  const paybackSamples: number[] = []

  for (let index = 0; index < iterations; index += 1) {
    if (index > 0 && index % SIMULATION_YIELD_INTERVAL === 0) {
      await yieldToEventLoop()
    }

    const sampledValues: Record<string, number> = {}

    for (const metric of notebook.metrics) {
      const value = sampleMetricValue(metric)

      sampledValues[metric.id] = value
      if (!metricSamples[metric.id]) {
        metricSamples[metric.id] = { metric, values: [] }
      }
      metricSamples[metric.id]!.values.push(value)
    }

    const evaluatedValues = evaluateFormulas(registry, sampledValues)

    const benefitsTotals: number[] = []
    const costsTotals: number[] = []

    for (const category of notebook.categories) {
      const rawContribution = getCategoryOutput(category, notebook.metrics, evaluatedValues, sampledValues)
      const contribution = category.type === "cost" ? -Math.abs(rawContribution) : rawContribution
      if (!categorySamples[category.id]) categorySamples[category.id] = []
      categorySamples[category.id]!.push(contribution)

      if (category.type === "benefit") benefitsTotals.push(Math.max(0, rawContribution))
      if (category.type === "cost") costsTotals.push(Math.abs(rawContribution))
    }

    const totalBenefits = benefitsTotals.reduce((accumulator, value) => accumulator + value, 0)
    const totalCosts = costsTotals.reduce((accumulator, value) => accumulator + value, 0)

    const yearlyCashFlows = createYearlyCashFlows(explicitYearNetFormulaIds, evaluatedValues, totalBenefits, totalCosts)
    const yearlyBenefits = yearlyCashFlows.map((cashFlow) => cashFlow.benefits)
    const yearlyCosts = yearlyCashFlows.map((cashFlow) => cashFlow.costs)
    const yearlyNet = yearlyCashFlows.map((cashFlow) => cashFlow.net)

    for (const [index, value] of yearlyBenefits.entries()) yearlyBenefitsSamples[index]!.push(value)
    for (const [index, value] of yearlyCosts.entries()) yearlyCostsSamples[index]!.push(value)
    for (const [index, value] of yearlyNet.entries()) yearlyNetSamples[index]!.push(value)

    const discountRate = evaluatedValues.discount_rate ?? sampledValues.discount_rate ?? 0.25
    const npvValue = yearlyNet.reduce(
      (accumulator, cashFlow, index) => accumulator + cashFlow / Math.pow(1 + discountRate, index + 1),
      0
    )
    npvSamples.push(npvValue)

    paybackSamples.push(estimatePaybackMonths(yearlyBenefits, yearlyCosts))
  }

  const npvStats = createStats(npvSamples)

  const sensitivity = Object.values(metricSamples)
    .map(({ metric, values }) => ({
      metricId: metric.id,
      metricName: metric.name,
      impact: correlation(values, npvSamples),
    }))
    .toSorted((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 8)

  const categoryContributions = notebook.categories.map((category) => {
    const values = categorySamples[category.id] ?? []
    const contribution = mean(values)
    return {
      categoryId: category.id,
      categoryName: category.name,
      contribution,
      percentage: npvStats.mean === 0 ? 0 : (contribution / npvStats.mean) * 100,
    }
  })

  const yearlyResults = yearlyNetSamples.map((netSamples, index) => ({
    year: index + 1,
    benefits: createStats(yearlyBenefitsSamples[index]!),
    costs: createStats(yearlyCostsSamples[index]!),
    net: createStats(netSamples),
  }))

  return {
    npv: npvStats,
    paybackPeriod: createStats(paybackSamples),
    yearlyResults,
    categoryContributions,
    sensitivityAnalysis: sensitivity,
    metadata: {
      calculationTimeMs: 0,
      iterations,
      timestamp: new Date().toISOString(),
    },
  }
}

const estimatePaybackMonths = (benefits: number[], costs: number[]): number => {
  if (costs.every((cost) => cost <= 0)) {
    return 0
  }

  let cumulative = -costs[0]!
  let month = 0
  for (let year = 0; year < 3; year += 1) {
    const monthlyBenefit = benefits[year]! / 12
    const monthlyCost = costs[year]! / 12
    for (let m = 0; m < 12; m += 1) {
      month += 1
      cumulative += monthlyBenefit - monthlyCost
      if (cumulative >= 0) {
        return month
      }
    }
  }
  return 36
}

const createStats = (samples: number[]) => {
  const sortedSamples = samples.toSorted((a, b) => a - b)

  return {
    p10: quantile(sortedSamples, 0.1),
    p25: quantile(sortedSamples, 0.25),
    p50: quantile(sortedSamples, 0.5),
    p75: quantile(sortedSamples, 0.75),
    p90: quantile(sortedSamples, 0.9),
    mean: mean(samples),
    std: stddev(samples),
  }
}
