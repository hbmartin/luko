/* eslint-disable @typescript-eslint/no-non-null-assertion, unicorn/no-for-loop */

import { compileNotebookFormulas, evaluatePlan, planEvaluation } from "@/lib/formulas"
import { Category, Metric, Notebook, SimulationResult } from "@/lib/types/notebook"

const DEFAULT_ITERATIONS = 100_000
const MIN_SIMULATION_ITERATIONS = 1
const MAX_SIMULATION_ITERATIONS = 250_000
const SIMULATION_YEAR_COUNT = 3
const SIMULATION_YIELD_INTERVAL = 500
const EMPTY_SAMPLES = new Float64Array(0)

type NumberSamples = ArrayLike<number>

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

const quantile = (sortedValues: NumberSamples, q: number): number => {
  if (sortedValues.length === 0) return 0
  const index = (sortedValues.length - 1) * q
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]!
  const weight = index - lower
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight
}

const mean = (values: NumberSamples) => {
  if (values.length === 0) return 0
  let total = 0
  for (let index = 0; index < values.length; index += 1) {
    total += values[index]!
  }
  return total / values.length
}

const stddev = (values: NumberSamples) => {
  if (values.length <= 1) return 0
  const avg = mean(values)
  let squaredDeltaTotal = 0
  for (let index = 0; index < values.length; index += 1) {
    const delta = values[index]! - avg
    squaredDeltaTotal += delta * delta
  }
  const variance = squaredDeltaTotal / (values.length - 1)
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
  financialMetrics: Metric[],
  evaluatedValues: Record<string, number>,
  sampledValues: Record<string, number>
) => {
  let total = 0
  for (const metric of financialMetrics) {
    total += evaluatedValues[metric.id] ?? sampledValues[metric.id] ?? 0
  }
  return total
}

const getCategoryOutput = (
  category: Category,
  financialMetrics: Metric[],
  evaluatedValues: Record<string, number>,
  sampledValues: Record<string, number>
) => {
  if (category.outputFormulaId) {
    const value = evaluatedValues[category.outputFormulaId]
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Category ${category.name} output formula could not be evaluated.`)
    }
    return value
  }

  return fallbackCategoryOutput(category, financialMetrics, evaluatedValues, sampledValues)
}

const normalizeFormulaKey = (value: string) => value.toLowerCase().replaceAll(/[\s-]+/g, "_")

const getEvaluatedFormulaNumber = (evaluatedValues: Record<string, number>, formulaId: string) => {
  const value = evaluatedValues[formulaId]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

interface YearFormulaLookup {
  byNormalizedId: Map<string, string>
  byNormalizedName: Map<string, string>
}

const buildYearFormulaLookup = (notebook: Notebook): YearFormulaLookup => {
  const byNormalizedId = new Map<string, string>()
  const byNormalizedName = new Map<string, string>()

  for (const formula of notebook.formulas) {
    byNormalizedId.set(normalizeFormulaKey(formula.id), formula.id)
    byNormalizedName.set(normalizeFormulaKey(formula.name), formula.id)
  }

  return { byNormalizedId, byNormalizedName }
}

const findYearFormulaId = (lookup: YearFormulaLookup, year: number, term: string) => {
  const yearKey = String(year)
  const normalizedCandidates = new Set([
    `formula_year_${yearKey}_${term}`,
    `year_${yearKey}_${term}`,
    `formula_year_${yearKey}_${term}_cash_flow`,
    `year_${yearKey}_${term}_cash_flow`,
  ])

  for (const candidate of normalizedCandidates) {
    const formulaId = lookup.byNormalizedId.get(candidate)
    if (formulaId) return formulaId
  }

  const normalizedNameCandidates = new Set([
    `year_${yearKey}_${term}`,
    `year_${yearKey}_${term}_cash_flow`,
    `year_${yearKey}_${term}_cashflow`,
  ])

  for (const candidate of normalizedNameCandidates) {
    const formulaId = lookup.byNormalizedName.get(candidate)
    if (formulaId) return formulaId
  }

  return
}

const getExplicitYearNetFormulaIds = (lookup: YearFormulaLookup) =>
  Array.from({ length: SIMULATION_YEAR_COUNT }, (_value, index) => findYearFormulaId(lookup, index + 1, "net"))

const writeYearlyCashFlows = (
  explicitYearNetFormulaIds: Array<string | undefined>,
  evaluatedValues: Record<string, number>,
  totalBenefits: number,
  totalCosts: number,
  yearlyBenefits: Float64Array,
  yearlyCosts: Float64Array,
  yearlyNet: Float64Array
) => {
  for (let index = 0; index < SIMULATION_YEAR_COUNT; index += 1) {
    const formulaId = explicitYearNetFormulaIds[index]
    const netValue = formulaId ? getEvaluatedFormulaNumber(evaluatedValues, formulaId) : undefined
    if (typeof netValue === "number") {
      yearlyBenefits[index] = totalBenefits
      yearlyCosts[index] = totalBenefits - netValue
      yearlyNet[index] = netValue
      continue
    }

    yearlyBenefits[index] = totalBenefits
    yearlyCosts[index] = totalCosts
    yearlyNet[index] = totalBenefits - totalCosts
  }
}

const correlation = (x: NumberSamples, y: NumberSamples) => {
  if (x.length === 0 || x.length !== y.length) return 0
  const meanX = mean(x)
  const meanY = mean(y)
  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let index = 0; index < x.length; index += 1) {
    const element = x[index]!
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
  values: Float64Array
}

interface CategorySimulationPlan {
  category: Category
  financialMetrics: Metric[]
  samples: Float64Array
}

const yieldToEventLoop = () =>
  new Promise<void>((resolve) => {
    if (typeof globalThis.setImmediate === "function") {
      globalThis.setImmediate(resolve)
      return
    }

    globalThis.setTimeout(resolve, 0)
  })

const assertValidIterationCount = (iterations: number) => {
  if (
    !Number.isFinite(iterations) ||
    !Number.isInteger(iterations) ||
    iterations < MIN_SIMULATION_ITERATIONS ||
    iterations > MAX_SIMULATION_ITERATIONS
  ) {
    throw new RangeError("Simulation iterations must be an integer between 1 and 250000.")
  }
}

export async function runSimulation(
  notebook: Notebook,
  iterations: number = DEFAULT_ITERATIONS
): Promise<SimulationResult> {
  assertValidIterationCount(iterations)

  const metrics = notebook.metrics
  const registry = compileNotebookFormulas(notebook)
  const allowedFormulaKeys = new Set([...Object.keys(registry), ...metrics.map((metric) => metric.id)])
  const evaluationPlan = planEvaluation(registry, allowedFormulaKeys)
  const expectedPlannedFormulaCount = Object.keys(registry).length
  const plannedFormulaCount = evaluationPlan.order.reduce(
    (count, formulaId) => (registry[formulaId] ? count + 1 : count),
    0
  )
  if (plannedFormulaCount !== expectedPlannedFormulaCount) {
    throw new Error("Formula evaluation plan is incomplete.")
  }

  const yearFormulaLookup = buildYearFormulaLookup(notebook)
  const explicitYearNetFormulaIds = getExplicitYearNetFormulaIds(yearFormulaLookup)
  const yieldInterval = SIMULATION_YIELD_INTERVAL

  const metricSamples: Record<string, MetricSampleTrack> = {}
  const metricSampleArrays = metrics.map(() => new Float64Array(iterations))
  const sampledValues: Record<string, number> = {}
  const evaluatedValues: Record<string, number> = {}
  for (let metricIndex = 0; metricIndex < metrics.length; metricIndex += 1) {
    const metric = metrics[metricIndex]!
    metricSamples[metric.id] = { metric, values: metricSampleArrays[metricIndex]! }
  }

  const financialMetricsByCategoryId = new Map<string, Metric[]>()
  for (const metric of metrics) {
    if (!isFinancialMetric(metric)) continue
    const categoryMetrics = financialMetricsByCategoryId.get(metric.categoryId)
    if (categoryMetrics) {
      categoryMetrics.push(metric)
    } else {
      financialMetricsByCategoryId.set(metric.categoryId, [metric])
    }
  }

  const categorySamples: Record<string, Float64Array> = {}
  const benefitCategories: CategorySimulationPlan[] = []
  const costCategories: CategorySimulationPlan[] = []
  for (const category of notebook.categories) {
    const samples = new Float64Array(iterations)
    categorySamples[category.id] = samples
    if (category.type === "facts") continue

    const plan = {
      category,
      financialMetrics: financialMetricsByCategoryId.get(category.id) ?? [],
      samples,
    }
    if (category.type === "benefit") {
      benefitCategories.push(plan)
    } else {
      costCategories.push(plan)
    }
  }

  const yearlyBenefitsSamples = Array.from({ length: SIMULATION_YEAR_COUNT }, () => new Float64Array(iterations))
  const yearlyCostsSamples = Array.from({ length: SIMULATION_YEAR_COUNT }, () => new Float64Array(iterations))
  const yearlyNetSamples = Array.from({ length: SIMULATION_YEAR_COUNT }, () => new Float64Array(iterations))
  const yearlyBenefits = new Float64Array(SIMULATION_YEAR_COUNT)
  const yearlyCosts = new Float64Array(SIMULATION_YEAR_COUNT)
  const yearlyNet = new Float64Array(SIMULATION_YEAR_COUNT)
  const npvSamples = new Float64Array(iterations)
  const paybackSamples = new Float64Array(iterations)

  for (let index = 0; index < iterations; index += 1) {
    if (index > 0 && index % yieldInterval === 0) {
      await yieldToEventLoop()
    }

    for (let metricIndex = 0; metricIndex < metrics.length; metricIndex += 1) {
      const metric = metrics[metricIndex]!
      const value = sampleMetricValue(metric)

      sampledValues[metric.id] = value
      metricSampleArrays[metricIndex]![index] = value
    }

    evaluatePlan(evaluationPlan, sampledValues, evaluatedValues)

    let totalBenefits = 0
    let totalCosts = 0

    for (const { category, financialMetrics, samples } of benefitCategories) {
      const rawContribution = getCategoryOutput(category, financialMetrics, evaluatedValues, sampledValues)
      samples[index] = rawContribution
      totalBenefits += Math.max(0, rawContribution)
    }

    for (const { category, financialMetrics, samples } of costCategories) {
      const rawContribution = getCategoryOutput(category, financialMetrics, evaluatedValues, sampledValues)
      const cost = Math.abs(rawContribution)
      samples[index] = -cost
      totalCosts += cost
    }

    writeYearlyCashFlows(
      explicitYearNetFormulaIds,
      evaluatedValues,
      totalBenefits,
      totalCosts,
      yearlyBenefits,
      yearlyCosts,
      yearlyNet
    )

    const discountRate = evaluatedValues.discount_rate ?? sampledValues.discount_rate ?? 0.25
    const inverseDiscountFactor = 1 / (1 + discountRate)
    let discountFactor = inverseDiscountFactor
    let npvValue = 0
    for (let yearIndex = 0; yearIndex < SIMULATION_YEAR_COUNT; yearIndex += 1) {
      const net = yearlyNet[yearIndex]!
      yearlyBenefitsSamples[yearIndex]![index] = yearlyBenefits[yearIndex]!
      yearlyCostsSamples[yearIndex]![index] = yearlyCosts[yearIndex]!
      yearlyNetSamples[yearIndex]![index] = net
      npvValue += net * discountFactor
      discountFactor *= inverseDiscountFactor
    }
    npvSamples[index] = npvValue

    paybackSamples[index] = estimatePaybackMonths(yearlyBenefits, yearlyCosts)
  }

  const npvStats = createStats(npvSamples)

  const sensitivity = notebook.metrics
    .map((metric, index) => ({
      metricId: metric.id,
      metricName: metric.name,
      impact: correlation(metricSamples[metric.id]?.values ?? [], npvSamples),
      index,
    }))
    .toSorted((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || a.index - b.index)
    .slice(0, 8)
    .map(({ metricId, metricName, impact }) => ({ metricId, metricName, impact }))

  const categoryContributions = notebook.categories.map((category) => {
    const values = categorySamples[category.id] ?? EMPTY_SAMPLES
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

const estimatePaybackMonths = (benefits: NumberSamples, costs: NumberSamples): number => {
  let hasPositiveCost = false
  for (let index = 0; index < costs.length; index += 1) {
    if (costs[index]! > 0) {
      hasPositiveCost = true
      break
    }
  }

  if (!hasPositiveCost) {
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

const createStats = (samples: NumberSamples) => {
  const sortedSamples = new Float64Array(samples)
  sortedSamples.sort()

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
