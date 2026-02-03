import { listRegions } from "../data/regions"

export const checkRegion = async (locale: string) => {
  const regions = await listRegions()
  if (!regions || regions.length === 0) {
    return false
  }

  const countries = regions
    .map((r) => r.countries?.map((c) => c.iso_2))
    .flat()
    .filter(Boolean)

  return countries.includes(locale)
}
