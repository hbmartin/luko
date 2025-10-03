import { tokenizeFormula } from "./tokenizer"
import type { FormulaNode, Token } from "./types"

export function parseFormula(input: string): FormulaNode {
  const tokens = tokenizeFormula(input)
  let position = 0

  const peek = () => tokens[position]
  const consume = () => tokens[position++]
  const expect = (type: Token["type"], value?: string) => {
    const token = peek()
    if (!token || token.type !== type || (value && token.value !== value)) {
      throw new Error(`Unexpected token at position ${token?.index ?? input.length}`)
    }
    position += 1
    return token
  }

  const parseExpression = (): FormulaNode => parseAddition()

  const parseAddition = (): FormulaNode => {
    let node = parseMultiplication()

    while (true) {
      const token = peek()
      if (!token || token.type !== "operator" || (token.value !== "+" && token.value !== "-")) {
        break
      }
      consume()
      const right = parseMultiplication()
      node = {
        type: "BinaryExpression",
        operator: token.value as "+" | "-",
        left: node,
        right,
      }
    }

    return node
  }

  const parseMultiplication = (): FormulaNode => {
    let node = parseUnary()

    while (true) {
      const token = peek()
      if (!token || token.type !== "operator" || (token.value !== "*" && token.value !== "/")) {
        break
      }
      consume()
      const right = parseUnary()
      node = {
        type: "BinaryExpression",
        operator: token.value as "*" | "/",
        left: node,
        right,
      }
    }

    return node
  }

  const parseUnary = (): FormulaNode => {
    const token = peek()
    if (token && token.type === "operator" && (token.value === "+" || token.value === "-")) {
      consume()
      const argument = parseUnary()
      return {
        type: "UnaryExpression",
        operator: token.value as "+" | "-",
        argument,
      }
    }
    return parsePrimary()
  }

  const parsePrimary = (): FormulaNode => {
    const token = peek()
    if (!token) {
      throw new Error("Unexpected end of expression")
    }

    if (token.type === "number") {
      consume()
      return { type: "NumberLiteral", value: Number.parseFloat(token.value) }
    }

    if (token.type === "identifier") {
      consume()
      if (peek()?.type === "leftParen") {
        consume()
        const args: FormulaNode[] = []
        if (peek()?.type !== "rightParen") {
          do {
            args.push(parseExpression())
            if (peek()?.type === "comma") {
              consume()
            } else {
              break
            }
          } while (true)
        }
        expect("rightParen")
        return {
          type: "CallExpression",
          callee: token.value,
          arguments: args,
        }
      }

      return { type: "Reference", name: token.value }
    }

    if (token.type === "leftParen") {
      consume()
      const node = parseExpression()
      expect("rightParen")
      return node
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.index}`)
  }

  const ast = parseExpression()
  if (position < tokens.length) {
    throw new Error(`Unexpected token '${tokens[position].value}' at position ${tokens[position].index}`)
  }
  return ast
}
