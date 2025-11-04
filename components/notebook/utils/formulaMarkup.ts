import { detectDependencies } from "@/lib/math-utils"
import type { Notebook } from "@/lib/types/notebook"

type ReferenceableNotebookItem = Notebook["metrics"][number] | Notebook["formulas"][number]

type ReferenceableLookup = Record<string, ReferenceableNotebookItem | undefined>

/**
 * Convert a plain expression into mentions markup understood by MentionsInput.
 * It replaces occurrences of known metric or formula IDs with the @[display](id) syntax.
 */
export function buildFormulaMarkup(expression: string, referenceableIds: ReferenceableLookup): string {
  if (!expression) return ""

  const detected = detectDependencies(expression)
  if (!detected || detected.size === 0) {
    return expression
  }

  const sortedIds = [...detected].sort((a, b) => b.length - a.length)

  return sortedIds.reduce((accumulator, id) => {
    const display = referenceableIds[id]?.name ?? id
    return accumulator.replaceAll(id, `@[${display}](${id})`)
  }, expression)
}
