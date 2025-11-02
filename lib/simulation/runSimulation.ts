import { compileMetricFormulas, evaluateFormulas } from "@/lib/formulas"
import { Metric, Notebook, SimulationResult } from "@/lib/types/notebook"

const DEFAULT_ITERATIONS = 5000

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
  const u1 = Math.random()
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

const quantile = (values: number[], q: number): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * q
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]!
  const weight = index - lower
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
}

const mean = (values: number[]) => (values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0)

const stddev = (values: number[]) => {
  if (values.length <= 1) return 0
  const avg = mean(values)
  const variance = values.reduce((acc, value) => acc + Math.pow(value - avg, 2), 0) / (values.length - 1)
  return Math.sqrt(variance)
}

const isFinancialMetric = (metric: Metric) => metric.unit?.includes("$")

const correlation = (x: number[], y: number[]) => {
  if (!x.length || x.length !== y.length) return 0
  const meanX = mean(x)
  const meanY = mean(y)
  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i]! - meanX
    const dy = y[i]! - meanY
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

export async function runSimulation(
  notebook: Notebook,
  iterations: number = DEFAULT_ITERATIONS
): Promise<SimulationResult> {
  const registry = compileMetricFormulas(notebook.metrics)
  const metricSamples: Record<string, MetricSampleTrack> = {}
  const categorySamples: Record<string, number[]> = {}
  const yearlyBenefitsSamples = Array.from({ length: 3 }, () => [] as number[])
  const yearlyCostsSamples = Array.from({ length: 3 }, () => [] as number[])
  const yearlyNetSamples = Array.from({ length: 3 }, () => [] as number[])
  const npvSamples: number[] = []
  const paybackSamples: number[] = []

  for (let i = 0; i < iterations; i += 1) {
    const sampledValues: Record<string, number> = {}

    notebook.metrics.forEach((metric) => {
      let value = metric.value ?? 0
      if (metric.distribution) {
        value = samplePert(
          metric.distribution.min ?? 0,
          metric.distribution.mode ?? 0.5,
          metric.distribution.max ?? 1.0
        )
      }

      sampledValues[metric.id] = value
      if (!metricSamples[metric.id]) {
        metricSamples[metric.id] = { metric, values: [] }
      }
      metricSamples[metric.id]!.values.push(value)
    })

    const evaluatedValues = evaluateFormulas(registry, sampledValues)

    const benefitsTotals: number[] = []
    const costsTotals: number[] = []

    notebook.categories.forEach((category) => {
      const metricsInCategory = notebook.metrics.filter((metric) => metric.categoryId === category.id)
      const contribution = metricsInCategory.reduce((acc, metric) => {
        const value = evaluatedValues[metric.id] ?? sampledValues[metric.id] ?? 0
        if (!isFinancialMetric(metric)) return acc
        return acc + value
      }, 0)
      if (!categorySamples[category.id]) categorySamples[category.id] = []
      categorySamples[category.id]!.push(contribution)

      if (category.type === "benefit") benefitsTotals.push(contribution)
      if (category.type === "cost") costsTotals.push(contribution)
    })

    const totalBenefits = benefitsTotals.reduce((acc, value) => acc + value, 0)
    const totalCosts = costsTotals.reduce((acc, value) => acc + value, 0)

    const growthMultiplier = [1, 1.07, 1.15]
    const efficiencyMultiplier = [1, 0.95, 0.9]

    const yearlyBenefits = growthMultiplier.map((multiplier) => totalBenefits * multiplier)
    const yearlyCosts = efficiencyMultiplier.map((multiplier) => totalCosts * multiplier)
    const yearlyNet = yearlyBenefits.map((benefit, index) => benefit - yearlyCosts[index]!)

    yearlyBenefits.forEach((value, index) => yearlyBenefitsSamples[index]!.push(value))
    yearlyCosts.forEach((value, index) => yearlyCostsSamples[index]!.push(value))
    yearlyNet.forEach((value, index) => yearlyNetSamples[index]!.push(value))

    const discountRate = evaluatedValues.discount_rate ?? sampledValues.discount_rate ?? 0.25
    const npvValue = yearlyNet.reduce(
      (acc, cashFlow, index) => acc + cashFlow / Math.pow(1 + discountRate, index + 1),
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
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
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
    paybackPeriod: {
      p50: quantile(paybackSamples, 0.5),
    },
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

const createStats = (samples: number[]) => ({
  p10: quantile(samples, 0.1),
  p25: quantile(samples, 0.25),
  p50: quantile(samples, 0.5),
  p75: quantile(samples, 0.75),
  p90: quantile(samples, 0.9),
  mean: mean(samples),
  std: stddev(samples),
})
