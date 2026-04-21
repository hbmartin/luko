import { detectDependencies } from "@/lib/math-utils"
import type { ReferenceableNotebookItem } from "@/lib/utils/notebook-indices"

/**
 * Convert a plain expression into mentions markup understood by MentionsInput.
 * It replaces occurrences of known metric or formula IDs with the @[display](id) syntax.
 */
export function buildFormulaMarkup(
  expression: string,
  referenceableIds: ReadonlyMap<string, ReferenceableNotebookItem>
): string {
  if (!expression) return ""

  const detected = detectDependencies(expression)
  if (!detected || detected.size === 0) {
    return expression
  }

  const sortedIds = [...detected].toSorted((a, b) => b.length - a.length)

  return sortedIds.reduce((accumulator, id) => {
    const display = referenceableIds.get(id)?.name ?? id
    return accumulator.replaceAll(id, `@[${display}](${id})`)
  }, expression)
}
