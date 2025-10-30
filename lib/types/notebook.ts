import { z } from "zod"

// ============================================================================
// Distribution & Metric Types
// ============================================================================

export const DistributionSchema = z.object({
  min: z.number(),
  mode: z.number(), // most likely value
  max: z.number(),
})

export type Distribution = z.infer<typeof DistributionSchema>

export const UnitTypeSchema = z.enum([
  "$/hour",
  "$/day",
  "$/week",
  "$/month",
  "$/year",
  "$",
  "hours/week",
  "hours/year",
  "%",
  "FTE",
  "count",
  "count/year",
  "dimensionless",
])

export type UnitType = z.infer<typeof UnitTypeSchema>

// ============================================================================
// Metric Types
// ============================================================================

export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  unit: UnitTypeSchema,
  distribution: DistributionSchema.nullable(), // null for fixed values
  value: z.number().optional(), // for fixed/constant values
  formula: z.string().optional(), // formula referencing other metrics
  categoryId: z.string(),
})

export type Metric = z.infer<typeof MetricSchema>

// ============================================================================
// Category Types
// ============================================================================

export const CategoryTypeSchema = z.enum(["benefit", "cost", "facts"])

export type CategoryType = z.infer<typeof CategoryTypeSchema>

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: CategoryTypeSchema,
  order: z.number(),
  isExpanded: z.boolean().default(true),
  totalFormula: z.string().optional(), // required formula for total calculation
})

export type Category = z.infer<typeof CategorySchema>

// ============================================================================
// Formula Types
// ============================================================================

export const FormulaTokenSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("metric"),
    metricId: z.string(),
  }),
  z.object({
    type: z.literal("operator"),
    value: z.enum(["+", "-", "*", "/"]),
  }),
  z.object({
    type: z.literal("paren"),
    value: z.enum(["(", ")"]),
  }),
])

export type FormulaToken = z.infer<typeof FormulaTokenSchema>

export const FormulaSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string(),
  description: z.string().optional(),
  tokens: z.array(FormulaTokenSchema),
  updatedAt: z.string(),
})

export type Formula = z.infer<typeof FormulaSchema>

// ============================================================================
// Simulation Types
// ============================================================================

export const SimulationResultSchema = z.object({
  npv: z.object({
    p10: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p90: z.number(),
    mean: z.number(),
    std: z.number(),
  }),
  paybackPeriod: z.object({
    p50: z.number(), // in months
  }),
  yearlyResults: z.array(
    z.object({
      year: z.number(),
      benefits: z.object({
        p10: z.number(),
        p25: z.number(),
        p50: z.number(),
        p75: z.number(),
        p90: z.number(),
        mean: z.number(),
      }),
      costs: z.object({
        p10: z.number(),
        p25: z.number(),
        p50: z.number(),
        p75: z.number(),
        p90: z.number(),
        mean: z.number(),
      }),
      net: z.object({
        p10: z.number(),
        p25: z.number(),
        p50: z.number(),
        p75: z.number(),
        p90: z.number(),
        mean: z.number(),
      }),
    })
  ),
  categoryContributions: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      contribution: z.number(),
      percentage: z.number(),
    })
  ),
  sensitivityAnalysis: z.array(
    z.object({
      metricId: z.string(),
      metricName: z.string(),
      impact: z.number(), // correlation coefficient
    })
  ),
  metadata: z.object({
    calculationTimeMs: z.number(),
    iterations: z.number(),
    timestamp: z.string(),
  }),
})

export type SimulationResult = z.infer<typeof SimulationResultSchema>

export const SimulationRunSchema = z.object({
  id: z.string(),
  notebookId: z.string(),
  timestamp: z.string(),
  // inputSnapshot: z.record(z.any()), // snapshot of all metric values at run time
  results: SimulationResultSchema,
})

export type SimulationRun = z.infer<typeof SimulationRunSchema>

// ============================================================================
// Notebook Types
// ============================================================================

export const NotebookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  categories: z.array(CategorySchema),
  metrics: z.array(MetricSchema),
  formulas: z.array(FormulaSchema),
  lastSimulationId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isDirty: z.boolean().default(false), // has changes since last simulation
  dirtyMetrics: z.array(z.string()).default([]), // IDs of changed metrics
  dirtyFormulas: z.array(z.string()).default([]),
})

export type Notebook = z.infer<typeof NotebookSchema>

// ============================================================================
// Grid Row Types (for react-data-grid)
// ============================================================================
export interface MetricRow {
  id: string
  type: "metric"
  name: string
  unit: UnitType
  min: number | null
  mode: number | null
  max: number | null
  categoryId: string
  isDirty: boolean
  description?: string
}

export interface CategoryRow {
  id: string
  type: "category"
  name: string
  isExpanded: boolean
  description?: string
  level: number // for hierarchy display
  depth: number
}

export interface FormulaRow {
  id: string
  type: "formula"
  name: string
  tokens: FormulaToken[]
  categoryId: string
  isDirty: boolean
  description?: string
}

export type GridRow = MetricRow | CategoryRow | FormulaRow

// ============================================================================
// Helper Types
// ============================================================================

export interface DirtyState {
  metricId: string
  oldValue: Distribution | number
  newValue: Distribution | number
  timestamp: string
}

export interface ChangeHistory {
  changes: DirtyState[]
  canUndo: boolean
  canRedo: boolean
}
