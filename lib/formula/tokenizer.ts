import type { Token } from "./types"

const operatorChars = new Set(["+", "-", "*", "/"])

export function tokenizeFormula(input: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]

    if (char === " ") {
      index += 1
      continue
    }

    if (char === "(") {
      tokens.push({ type: "leftParen", value: char, index })
      index += 1
      continue
    }

    if (char === ")") {
      tokens.push({ type: "rightParen", value: char, index })
      index += 1
      continue
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char, index })
      index += 1
      continue
    }
    if (char === undefined) {
      throw new Error(`Unexpected end of input at position ${index}`)
    }

    if (operatorChars.has(char)) {
      tokens.push({ type: "operator", value: char, index })
      index += 1
      continue
    }

    if (isDigit(char) || (char === "." && isDigit(input[index + 1] ?? ""))) {
      const start = index
      index += 1
      while (isDigit(input[index] ?? "") || input[index] === ".") {
        index += 1
      }
      const value = input.slice(start, index)
      tokens.push({ type: "number", value, index: start })
      continue
    }

    if (isIdentifierStart(char)) {
      const start = index
      index += 1
      while (isIdentifierPart(input[index] ?? "")) {
        index += 1
      }
      const value = input.slice(start, index)
      tokens.push({ type: "identifier", value, index: start })
      continue
    }

    throw new Error(`Invalid character '${char}' at position ${index}`)
  }

  return tokens
}

const isDigit = (value: string) => value >= "0" && value <= "9"
const isIdentifierStart = (value: string) => /[a-zA-Z_]/.test(value)
const isIdentifierPart = (value: string) => /[a-zA-Z0-9_]/.test(value)
