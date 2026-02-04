import { ReadonlyURLSearchParams } from "next/navigation"

function escapeMeiliString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, '\\"')
}

function buildOrEquals(attribute: string, values: string[]) {
  const unique = Array.from(new Set(values.filter(Boolean)))
  if (!unique.length) return ""
  if (unique.length === 1) {
    return `${attribute} = \"${escapeMeiliString(unique[0])}\"`
  }
  return `(${unique
    .map((v) => `${attribute} = \"${escapeMeiliString(v)}\"`)
    .join(" OR ")})`
}

export function getMeiliFilters(
  searchParams: ReadonlyURLSearchParams,
  opts: {
    category_id?: string
    collection_id?: string
    seller_handle?: string
  }
) {
  const filters: string[] = []

  // Base marketplace constraints
  filters.push(`seller_store_status != \"SUSPENDED\"`)

  if (opts.seller_handle) {
    filters.push(`seller_handle = \"${escapeMeiliString(opts.seller_handle)}\"`)
  }

  if (opts.category_id) {
    filters.push(`categories_id = \"${escapeMeiliString(opts.category_id)}\"`)
  }

  if (opts.collection_id) {
    filters.push(`collection_id = \"${escapeMeiliString(opts.collection_id)}\"`)
  }

  const color = (searchParams.get("color") || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
  const size = (searchParams.get("size") || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
  const condition = (searchParams.get("condition") || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)

  const colorFilter = buildOrEquals("variants_color", color)
  const sizeFilter = buildOrEquals("variants_size", size)
  const conditionFilter = buildOrEquals("variants_condition", condition)

  if (colorFilter) filters.push(colorFilter)
  if (sizeFilter) filters.push(sizeFilter)
  if (conditionFilter) filters.push(conditionFilter)

  return filters.length ? filters.join(" AND ") : undefined
}
