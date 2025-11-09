/* eslint-disable unicorn/no-zero-fractions */
/* eslint-disable unicorn/no-null */
import { Category, Formula, Metric, Notebook, SimulationResult } from "@/lib/types/notebook"

// Factory constants
export const FACTORY_VARS = {
  weeksPerYear: 48,
  hoursPerWorkweek: 40,
}

// ============================================================================
// Mock Categories
// ============================================================================

export const mockCategories: Category[] = [
  {
    id: "cat-time-savings",
    name: "Time Savings Benefits (Internal)",
    description: "Productivity improvements from AI automation",
    type: "benefit",
    order: 1,
    isExpanded: true,
  },
  {
    id: "cat-quality",
    name: "Quality Improvement Benefits",
    description: "Preventing post-release bugs",
    type: "benefit",
    order: 2,
    isExpanded: true,
  },
  {
    id: "cat-product-delivery",
    name: "Product Delivery Benefits (External)",
    description: "Revenue impact from faster feature delivery",
    type: "benefit",
    order: 3,
    isExpanded: true,
  },
  {
    id: "cat-retention",
    name: "Employee Retention Benefits",
    description: "Cost savings from reduced turnover",
    type: "benefit",
    order: 4,
    isExpanded: true,
  },
  {
    id: "cat-costs",
    name: "AI Implementation Costs",
    description: "Ongoing costs for AI tools and support",
    type: "cost",
    order: 5,
    isExpanded: true,
  },
  {
    id: "cat-facts",
    name: "Facts & Assumptions",
    description: "Company-specific parameters",
    type: "facts",
    order: 0,
    isExpanded: true,
  },
]

// ============================================================================
// Mock Metrics
// ============================================================================

export const mockMetrics: Metric[] = [
  // Facts & Assumptions
  {
    id: "number_of_employees",
    name: "Number of Employees",
    description: "Total number of employees affected by AI implementation",
    unit: "count",
    value: 50,
    distribution: null,
    categoryId: "cat-facts",
  },
  {
    id: "avg_yearly_cost_per_employee",
    name: "Avg Yearly Fully Loaded Cost Per Employee",
    description: "Includes salary, benefits, and overhead",
    unit: "$/year",
    value: 230_000,
    distribution: null,
    categoryId: "cat-facts",
  },
  {
    id: "discount_rate",
    name: "Discount Rate",
    description: "Weighted Average Cost of Capital (WACC)",
    unit: "%",
    distribution: { min: 0.15, mode: 0.25, max: 0.35 },
    categoryId: "cat-facts",
  },

  // Time Savings Benefits
  {
    id: "weekly_hours_saved_per_employee",
    name: "Weekly Hours Saved per Employee",
    description: "Time saved through AI automation per employee per week",
    unit: "hours/week",
    distribution: { min: 2, mode: 5, max: 8 },
    categoryId: "cat-time-savings",
  },
  {
    id: "productivity_conversion_rate",
    name: "Productivity Conversion Rate",
    description: "Rate at which saved time is re-deployed as productive work",
    unit: "%",
    distribution: { min: 0.3, mode: 0.5, max: 0.7 },
    categoryId: "cat-time-savings",
  },
  {
    id: "time_savings_monetary_value",
    name: "Time Savings Monetary Value",
    description: "Annualized value created from reallocated hours",
    unit: "$/year",
    value: 0,
    distribution: null,
    formula:
      "weekly_hours_saved_per_employee * number_of_employees * 48 * (avg_yearly_cost_per_employee / (48 * 40)) * productivity_conversion_rate",
    categoryId: "cat-time-savings",
  },

  // Quality Improvement Benefits
  {
    id: "bug_reduction_rate",
    name: "Bug Reduction Rate",
    description: "Percentage reduction in post-release bugs",
    unit: "%",
    distribution: { min: 0.0, mode: 0.2, max: 0.3 },
    categoryId: "cat-quality",
  },
  {
    id: "bug_time_rate",
    name: "Bug Time Rate",
    description: "Fraction of employee time spent on bug remediation",
    unit: "%",
    distribution: { min: 0.2, mode: 0.3, max: 0.6 },
    categoryId: "cat-quality",
  },
  {
    id: "external_bug_cost",
    name: "External Bug Cost",
    description: "Yearly cost of customer churn and lost revenue due to bugs",
    unit: "$/year",
    distribution: { min: 0, mode: 20_000, max: 100_000 },
    categoryId: "cat-quality",
  },

  // Product Delivery Benefits
  {
    id: "feature_delivery_rate",
    name: "Feature Delivery Rate",
    description: "Percentage uplift in feature shipping speed",
    unit: "%",
    distribution: { min: 0.1, mode: 0.25, max: 0.4 },
    categoryId: "cat-product-delivery",
  },
  {
    id: "feature_attribution_factor",
    name: "Feature Attribution Factor",
    description: "Fraction of new customer acquisition attributed to new features",
    unit: "%",
    distribution: { min: 0, mode: 0.1, max: 0.2 },
    categoryId: "cat-product-delivery",
  },
  {
    id: "new_customers_per_year",
    name: "New Customers per Year",
    description: "Expected new customer acquisition rate",
    unit: "count/year",
    distribution: { min: 10_000, mode: 100_000, max: 250_000 },
    categoryId: "cat-product-delivery",
  },
  {
    id: "yearly_customer_value",
    name: "Yearly Customer Value",
    description: "Average revenue per customer per year",
    unit: "$/year",
    distribution: { min: 5, mode: 10, max: 15 },
    categoryId: "cat-product-delivery",
  },

  // Employee Retention Benefits
  {
    id: "retention_improvement_rate",
    name: "Retention Improvement Rate",
    description: "Reduction in employee turnover due to better tools",
    unit: "%",
    distribution: { min: 0, mode: 0.1, max: 0.4 },
    categoryId: "cat-retention",
  },
  {
    id: "current_yearly_turnover_rate",
    name: "Current Yearly Turnover Rate",
    description: "Baseline employee turnover rate",
    unit: "%",
    value: 0.2,
    distribution: null,
    categoryId: "cat-retention",
  },
  {
    id: "replacement_cost_per_employee",
    name: "Replacement Cost per Employee",
    description: "Total cost of recruiting, training, and lost productivity",
    unit: "$",
    distribution: { min: 60_000, mode: 75_000, max: 90_000 },
    categoryId: "cat-retention",
  },

  // AI Implementation Costs
  {
    id: "yearly_tool_cost",
    name: "Yearly Tool Cost",
    description: "Annual subscription cost for AI tools",
    unit: "$/year",
    distribution: { min: 30_000, mode: 50_000, max: 70_000 },
    categoryId: "cat-costs",
  },
  {
    id: "yearly_monitoring_support_cost",
    name: "Yearly Monitoring and Support Cost",
    description: "Ongoing operational costs",
    unit: "$/year",
    distribution: { min: 10_000, mode: 15_000, max: 25_000 },
    categoryId: "cat-costs",
  },
  {
    id: "first_year_change_management_cost",
    name: "First Year Change Management Cost",
    description: "One-time training and change management costs",
    unit: "$",
    distribution: { min: 15_000, mode: 25_000, max: 45_000 },
    categoryId: "cat-costs",
  },
  {
    id: "yearly_ai_staff_cost",
    name: "Yearly AI Staff Cost",
    description: "Dedicated AI/ML engineering staff costs",
    unit: "$/year",
    value: 300_000,
    distribution: null,
    categoryId: "cat-costs",
  },
]

const timeSavingsExpression =
  "weekly_hours_saved_per_employee * number_of_employees * 48 * (avg_yearly_cost_per_employee / (48 * 40)) * productivity_conversion_rate"

const qualitySavingsExpression =
  "external_bug_cost * bug_reduction_rate + avg_yearly_cost_per_employee * number_of_employees * bug_time_rate * bug_reduction_rate"

const revenueImpactExpression =
  "feature_delivery_rate * new_customers_per_year * yearly_customer_value * feature_attribution_factor"

const retentionSavingsExpression =
  "retention_improvement_rate * current_yearly_turnover_rate * number_of_employees * replacement_cost_per_employee"

const totalBenefitsExpression =
  "formula_time_savings_total + formula_quality_savings + formula_product_revenue_impact + formula_retention_savings"

const ongoingCostsExpression = "yearly_tool_cost + yearly_monitoring_support_cost + yearly_ai_staff_cost"

const yearOneNetCashFlowExpression = `(${totalBenefitsExpression}) - first_year_change_management_cost - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost`

const yearTwoNetCashFlowExpression = `(${totalBenefitsExpression}) - yearly_tool_cost - yearly_monitoring_support_cost - yearly_ai_staff_cost`

const yearThreeNetCashFlowExpression = yearTwoNetCashFlowExpression

const unityExpression = "avg_yearly_cost_per_employee / avg_yearly_cost_per_employee"

const onePlusDiscountExpression = `(${unityExpression} + discount_rate)`

const discountFactorSquaredExpression = `(${onePlusDiscountExpression} * ${onePlusDiscountExpression})`

const discountFactorCubedExpression = `(${onePlusDiscountExpression} * ${onePlusDiscountExpression} * ${onePlusDiscountExpression})`

const npvTermOneExpression = `(${yearOneNetCashFlowExpression}) / ${onePlusDiscountExpression}`

const npvTermTwoExpression = `(${yearTwoNetCashFlowExpression}) / ${discountFactorSquaredExpression}`

const npvTermThreeExpression = `(${yearThreeNetCashFlowExpression}) / ${discountFactorCubedExpression}`

const npvExpression = `${npvTermOneExpression} + ${npvTermTwoExpression} + ${npvTermThreeExpression}`

export const mockFormulas: Formula[] = [
  {
    id: "formula_time_savings_total",
    name: "Annual Time Savings",
    categoryId: "cat-time-savings",
    expression: timeSavingsExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_quality_savings",
    name: "Annual Quality Savings",
    categoryId: "cat-quality",
    expression: qualitySavingsExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_product_revenue_impact",
    name: "Annual Revenue Impact",
    categoryId: "cat-product-delivery",
    expression: revenueImpactExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_retention_savings",
    name: "Annual Retention Savings",
    categoryId: "cat-retention",
    expression: retentionSavingsExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_total_annual_benefits",
    name: "Total Annual Benefits",
    categoryId: "cat-facts",
    expression: totalBenefitsExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_ongoing_costs",
    name: "Ongoing Annual Costs",
    categoryId: "cat-costs",
    expression: ongoingCostsExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_year_1_net",
    name: "Year 1 Net Cash Flow",
    categoryId: "cat-facts",
    expression: yearOneNetCashFlowExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_year_2_net",
    name: "Year 2 Net Cash Flow",
    categoryId: "cat-facts",
    expression: yearTwoNetCashFlowExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_year_3_net",
    name: "Year 3 Net Cash Flow",
    categoryId: "cat-facts",
    expression: yearThreeNetCashFlowExpression,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "formula_npv_3_year",
    name: "NPV (3 Years)",
    categoryId: "cat-facts",
    expression: npvExpression,
    updatedAt: new Date().toISOString(),
  },
]

// ============================================================================
// Mock Notebook
// ============================================================================

export const mockNotebook: Notebook = {
  id: "notebook-1",
  name: "AI ROI Analysis - DevOps Automation",
  description: "Monte Carlo NPV analysis for AI implementation in DevOps",
  categories: mockCategories,
  metrics: mockMetrics,
  formulas: mockFormulas,
  lastSimulationId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDirty: false,
  dirtyMetrics: [],
  dirtyFormulas: [],
}

// ============================================================================
// Mock Simulation Results
// ============================================================================

export const mockSimulationResult: SimulationResult = {
  npv: {
    p10: 1_200_000,
    p25: 1_500_000,
    p50: 1_850_000,
    p75: 2_100_000,
    p90: 2_400_000,
    mean: 1_850_000,
    std: 450_000,
  },
  paybackPeriod: {
    p50: 4.2, // months
  },
  yearlyResults: [
    {
      year: 1,
      benefits: {
        p10: 800_000,
        p25: 950_000,
        p50: 1_100_000,
        p75: 1_250_000,
        p90: 1_400_000,
        mean: 1_100_000,
      },
      costs: {
        p10: 380_000,
        p25: 420_000,
        p50: 460_000,
        p75: 500_000,
        p90: 540_000,
        mean: 460_000,
      },
      net: {
        p10: 320_000,
        p25: 480_000,
        p50: 640_000,
        p75: 780_000,
        p90: 920_000,
        mean: 640_000,
      },
    },
    {
      year: 2,
      benefits: {
        p10: 850_000,
        p25: 1_000_000,
        p50: 1_150_000,
        p75: 1_300_000,
        p90: 1_450_000,
        mean: 1_150_000,
      },
      costs: {
        p10: 340_000,
        p25: 380_000,
        p50: 420_000,
        p75: 460_000,
        p90: 500_000,
        mean: 420_000,
      },
      net: {
        p10: 400_000,
        p25: 560_000,
        p50: 730_000,
        p75: 880_000,
        p90: 1_020_000,
        mean: 730_000,
      },
    },
    {
      year: 3,
      benefits: {
        p10: 900_000,
        p25: 1_050_000,
        p50: 1_200_000,
        p75: 1_350_000,
        p90: 1_500_000,
        mean: 1_200_000,
      },
      costs: {
        p10: 340_000,
        p25: 380_000,
        p50: 420_000,
        p75: 460_000,
        p90: 500_000,
        mean: 420_000,
      },
      net: {
        p10: 450_000,
        p25: 610_000,
        p50: 780_000,
        p75: 930_000,
        p90: 1_070_000,
        mean: 780_000,
      },
    },
  ],
  categoryContributions: [
    {
      categoryId: "cat-time-savings",
      categoryName: "Time Savings Benefits",
      contribution: 920_000,
      percentage: 48.5,
    },
    {
      categoryId: "cat-quality",
      categoryName: "Quality Improvement Benefits",
      contribution: 380_000,
      percentage: 20,
    },
    {
      categoryId: "cat-product-delivery",
      categoryName: "Product Delivery Benefits",
      contribution: 450_000,
      percentage: 23.7,
    },
    {
      categoryId: "cat-retention",
      categoryName: "Employee Retention Benefits",
      contribution: 150_000,
      percentage: 7.9,
    },
    {
      categoryId: "cat-costs",
      categoryName: "AI Implementation Costs",
      contribution: -520_000,
      percentage: -27.4,
    },
  ],
  sensitivityAnalysis: [
    {
      metricId: "weekly_hours_saved_per_employee",
      metricName: "Weekly Hours Saved per Employee",
      impact: 0.65,
    },
    {
      metricId: "productivity_conversion_rate",
      metricName: "Productivity Conversion Rate",
      impact: 0.42,
    },
    {
      metricId: "feature_delivery_rate",
      metricName: "Feature Delivery Rate",
      impact: 0.38,
    },
    {
      metricId: "new_customers_per_year",
      metricName: "New Customers per Year",
      impact: 0.35,
    },
    {
      metricId: "bug_reduction_rate",
      metricName: "Bug Reduction Rate",
      impact: 0.28,
    },
    {
      metricId: "yearly_tool_cost",
      metricName: "Yearly Tool Cost",
      impact: -0.25,
    },
    {
      metricId: "retention_improvement_rate",
      metricName: "Retention Improvement Rate",
      impact: 0.18,
    },
  ],
  metadata: {
    calculationTimeMs: 8500,
    iterations: 100_000,
    timestamp: new Date().toISOString(),
  },
}
