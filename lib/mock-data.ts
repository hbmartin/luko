import { Notebook, Metric, Category, SimulationResult } from "@/lib/types/notebook"

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
    value: 230000,
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
    distribution: { min: 0, mode: 20000, max: 100000 },
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
    distribution: { min: 0.0, mode: 0.1, max: 0.2 },
    categoryId: "cat-product-delivery",
  },
  {
    id: "new_customers_per_year",
    name: "New Customers per Year",
    description: "Expected new customer acquisition rate",
    unit: "count/year",
    distribution: { min: 10000, mode: 100000, max: 250000 },
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
    distribution: { min: 0.0, mode: 0.1, max: 0.4 },
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
    distribution: { min: 60000, mode: 75000, max: 90000 },
    categoryId: "cat-retention",
  },

  // AI Implementation Costs
  {
    id: "yearly_tool_cost",
    name: "Yearly Tool Cost",
    description: "Annual subscription cost for AI tools",
    unit: "$/year",
    distribution: { min: 30000, mode: 50000, max: 70000 },
    categoryId: "cat-costs",
  },
  {
    id: "yearly_monitoring_support_cost",
    name: "Yearly Monitoring and Support Cost",
    description: "Ongoing operational costs",
    unit: "$/year",
    distribution: { min: 10000, mode: 15000, max: 25000 },
    categoryId: "cat-costs",
  },
  {
    id: "first_year_change_management_cost",
    name: "First Year Change Management Cost",
    description: "One-time training and change management costs",
    unit: "$",
    distribution: { min: 15000, mode: 25000, max: 45000 },
    categoryId: "cat-costs",
  },
  {
    id: "yearly_ai_staff_cost",
    name: "Yearly AI Staff Cost",
    description: "Dedicated AI/ML engineering staff costs",
    unit: "$/year",
    value: 300000,
    distribution: null,
    categoryId: "cat-costs",
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
  lastSimulationId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDirty: false,
  dirtyMetrics: [],
}

// ============================================================================
// Mock Simulation Results
// ============================================================================

export const mockSimulationResult: SimulationResult = {
  npv: {
    p10: 1200000,
    p25: 1500000,
    p50: 1850000,
    p75: 2100000,
    p90: 2400000,
    mean: 1850000,
    std: 450000,
  },
  paybackPeriod: {
    p50: 4.2, // months
  },
  yearlyResults: [
    {
      year: 1,
      benefits: {
        p10: 800000,
        p25: 950000,
        p50: 1100000,
        p75: 1250000,
        p90: 1400000,
        mean: 1100000,
      },
      costs: {
        p10: 380000,
        p25: 420000,
        p50: 460000,
        p75: 500000,
        p90: 540000,
        mean: 460000,
      },
      net: {
        p10: 320000,
        p25: 480000,
        p50: 640000,
        p75: 780000,
        p90: 920000,
        mean: 640000,
      },
    },
    {
      year: 2,
      benefits: {
        p10: 850000,
        p25: 1000000,
        p50: 1150000,
        p75: 1300000,
        p90: 1450000,
        mean: 1150000,
      },
      costs: {
        p10: 340000,
        p25: 380000,
        p50: 420000,
        p75: 460000,
        p90: 500000,
        mean: 420000,
      },
      net: {
        p10: 400000,
        p25: 560000,
        p50: 730000,
        p75: 880000,
        p90: 1020000,
        mean: 730000,
      },
    },
    {
      year: 3,
      benefits: {
        p10: 900000,
        p25: 1050000,
        p50: 1200000,
        p75: 1350000,
        p90: 1500000,
        mean: 1200000,
      },
      costs: {
        p10: 340000,
        p25: 380000,
        p50: 420000,
        p75: 460000,
        p90: 500000,
        mean: 420000,
      },
      net: {
        p10: 450000,
        p25: 610000,
        p50: 780000,
        p75: 930000,
        p90: 1070000,
        mean: 780000,
      },
    },
  ],
  categoryContributions: [
    {
      categoryId: "cat-time-savings",
      categoryName: "Time Savings Benefits",
      contribution: 920000,
      percentage: 48.5,
    },
    {
      categoryId: "cat-quality",
      categoryName: "Quality Improvement Benefits",
      contribution: 380000,
      percentage: 20.0,
    },
    {
      categoryId: "cat-product-delivery",
      categoryName: "Product Delivery Benefits",
      contribution: 450000,
      percentage: 23.7,
    },
    {
      categoryId: "cat-retention",
      categoryName: "Employee Retention Benefits",
      contribution: 150000,
      percentage: 7.9,
    },
    {
      categoryId: "cat-costs",
      categoryName: "AI Implementation Costs",
      contribution: -520000,
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
    iterations: 100000,
    timestamp: new Date().toISOString(),
  },
}
