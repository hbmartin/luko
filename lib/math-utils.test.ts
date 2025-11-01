import { describe, expect, it } from "vitest"
import { detectDependencies } from "./math-utils"

describe("detectDependencies", () => {
  it("should return an empty set for expressions with no variables", () => {
    const result = detectDependencies("2 + 2")
    expect(result).toEqual(new Set())
  })

  it("should return an empty set for expressions with only numbers", () => {
    const result = detectDependencies("10 * 5 + 3")
    expect(result).toEqual(new Set())
  })

  it("should return an empty set for expressions with built-in functions", () => {
    const result = detectDependencies("sin(0.5) + cos(0.5)")
    expect(result).toEqual(new Set())
  })

  it("should detect constants like pi as dependencies", () => {
    const result = detectDependencies("pi * 2")
    expect(result).toEqual(new Set(["pi"]))
  })

  it("should detect a single variable dependency", () => {
    const result = detectDependencies("x + 2")
    expect(result).toEqual(new Set(["x"]))
  })

  it("should detect multiple variable dependencies", () => {
    const result = detectDependencies("x + y + z")
    expect(result).toEqual(new Set(["x", "y", "z"]))
  })

  it("should detect dependencies in complex expressions", () => {
    const result = detectDependencies("(revenue - costs) * taxRate")
    expect(result).toEqual(new Set(["revenue", "costs", "taxRate"]))
  })

  it("should detect dependencies with functions", () => {
    const result = detectDependencies("sqrt(initialInvestment) + npv")
    expect(result).toEqual(new Set(["initialInvestment", "npv"]))
  })

  it("should not duplicate dependencies when variable appears multiple times", () => {
    const result = detectDependencies("x + x * 2 + x / 3")
    expect(result).toEqual(new Set(["x"]))
  })

  it("should detect dependencies in nested expressions", () => {
    const result = detectDependencies("(a + b) * (c - d)")
    expect(result).toEqual(new Set(["a", "b", "c", "d"]))
  })

  it("should handle expressions with underscores in variable names", () => {
    const result = detectDependencies("monthly_revenue + annual_cost")
    expect(result).toEqual(new Set(["monthly_revenue", "annual_cost"]))
  })

  it("should handle expressions with camelCase variable names", () => {
    const result = detectDependencies("monthlyRevenue + annualCost")
    expect(result).toEqual(new Set(["monthlyRevenue", "annualCost"]))
  })

  it("should handle expressions with mixed operators", () => {
    const result = detectDependencies("a * b / c + d - e")
    expect(result).toEqual(new Set(["a", "b", "c", "d", "e"]))
  })

  it("should handle expressions with exponents", () => {
    const result = detectDependencies("base^exponent")
    expect(result).toEqual(new Set(["base", "exponent"]))
  })

  it("should handle empty string by returning empty set", () => {
    const result = detectDependencies("")
    expect(result).toEqual(new Set())
  })

  it("should handle expressions with parentheses", () => {
    const result = detectDependencies("((x + y) * z) / w")
    expect(result).toEqual(new Set(["x", "y", "z", "w"]))
  })

  it("should detect dependencies with comparison operators", () => {
    const result = detectDependencies("revenue > costs ? profit : loss")
    expect(result).toEqual(new Set(["revenue", "costs", "profit", "loss"]))
  })

  it("should handle expressions with arrays", () => {
    const result = detectDependencies("sum(values)")
    expect(result).toEqual(new Set(["values"]))
  })

  it("should detect dependencies in expressions with multiple operations", () => {
    const result = detectDependencies("(revenue - costs) / years * discountRate")
    expect(result).toEqual(new Set(["revenue", "costs", "years", "discountRate"]))
  })

  it("should handle expressions with boolean operators", () => {
    const result = detectDependencies("a and b or c")
    expect(result).toEqual(new Set(["a", "b", "c"]))
  })

  it("should detect dependencies with matrix/array operations", () => {
    const result = detectDependencies("matrix * vector")
    expect(result).toEqual(new Set(["matrix", "vector"]))
  })

  it("should handle expressions with modulo operator", () => {
    const result = detectDependencies("a % b")
    expect(result).toEqual(new Set(["a", "b"]))
  })

  it("should detect dependencies in conditional expressions", () => {
    const result = detectDependencies("if(condition, trueValue, falseValue)")
    expect(result).toEqual(new Set(["condition", "trueValue", "falseValue"]))
  })

  it("should handle complex nested function calls", () => {
    const result = detectDependencies("max(min(a, b), min(c, d))")
    expect(result).toEqual(new Set(["a", "b", "c", "d"]))
  })

  it("should detect all constants and variables mixed together", () => {
    const result = detectDependencies("e * x + pi * y")
    expect(result).toEqual(new Set(["e", "x", "pi", "y"]))
  })

  it("should handle expressions with scientific notation and variables", () => {
    const result = detectDependencies("1e5 * rate + offset")
    expect(result).toEqual(new Set(["rate", "offset"]))
  })
})
