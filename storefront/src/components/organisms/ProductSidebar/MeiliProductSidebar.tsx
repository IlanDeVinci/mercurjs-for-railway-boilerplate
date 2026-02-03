"use client"

import { Button, Chip, Input } from "@/components/atoms"
import { Accordion, FilterCheckboxOption, Modal } from "@/components/molecules"
import useFilters from "@/hooks/useFilters"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"
import useGetAllSearchParams from "@/hooks/useGetAllSearchParams"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import { ProductListingActiveFilters } from "../ProductListingActiveFilters/ProductListingActiveFilters"

type FacetDistribution = Record<string, Record<string, number>>

export const MeiliProductSidebar = ({
  facetDistribution,
}: {
  facetDistribution?: FacetDistribution | null
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const { allSearchParams } = useGetAllSearchParams()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const facets = facetDistribution || {}

  return isMobile ? (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full uppercase mb-4">
        Filters
      </Button>
      {isOpen && (
        <Modal heading="Filters" onClose={() => setIsOpen(false)}>
          <div className="px-4">
            <ProductListingActiveFilters />
            <PriceFilter
              defaultOpen={Boolean(
                allSearchParams.min_price || allSearchParams.max_price
              )}
            />
            <SizeFilter
              facets={facets}
              defaultOpen={Boolean(allSearchParams.size)}
            />
            <ColorFilter
              facets={facets}
              defaultOpen={Boolean(allSearchParams.color)}
            />
            <ConditionFilter
              facets={facets}
              defaultOpen={Boolean(allSearchParams.condition)}
            />
          </div>
        </Modal>
      )}
    </>
  ) : (
    <div>
      <PriceFilter />
      <SizeFilter facets={facets} />
      <ColorFilter facets={facets} />
      <ConditionFilter facets={facets} />
    </div>
  )
}

function useFacetItems(
  facets: FacetDistribution,
  attribute: string,
  opts?: { sortByCount?: boolean }
) {
  return useMemo(() => {
    const dist = facets?.[attribute] || {}
    const items = Object.entries(dist).map(([label, count]) => ({
      label,
      count,
    }))

    if (opts?.sortByCount) {
      items.sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    } else {
      items.sort((a, b) => String(a.label).localeCompare(String(b.label)))
    }

    return items
  }, [facets, attribute, opts?.sortByCount])
}

function ConditionFilter({
  facets,
  defaultOpen = true,
}: {
  facets: FacetDistribution
  defaultOpen?: boolean
}) {
  const items = useFacetItems(facets, "variants_condition")
  const { updateFilters, isFilterActive } = useFilters("condition")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }

  return (
    <Accordion heading="Condition" defaultOpen={defaultOpen}>
      <ul className="px-4">
        {items.map(({ label, count }) => (
          <li key={label} className="mb-4">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function ColorFilter({
  facets,
  defaultOpen = true,
}: {
  facets: FacetDistribution
  defaultOpen?: boolean
}) {
  const items = useFacetItems(facets, "variants_color", { sortByCount: true })
  const { updateFilters, isFilterActive } = useFilters("color")

  const selectHandler = (option: string) => {
    updateFilters(option)
  }

  return (
    <Accordion heading="Color" defaultOpen={defaultOpen}>
      <ul className="px-4">
        {items.map(({ label, count }) => (
          <li key={label} className="mb-4 flex items-center justify-between">
            <FilterCheckboxOption
              checked={isFilterActive(label)}
              disabled={Boolean(!count)}
              onCheck={selectHandler}
              label={label}
            />
            <div
              style={{ backgroundColor: String(label || "").toLowerCase() }}
              className={cn(
                "w-5 h-5 border border-primary rounded-xs",
                Boolean(!label) && "opacity-30"
              )}
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function SizeFilter({
  facets,
  defaultOpen = true,
}: {
  facets: FacetDistribution
  defaultOpen?: boolean
}) {
  const items = useFacetItems(facets, "variants_size")
  const { updateFilters, isFilterActive } = useFilters("size")

  const selectSizeHandler = (size: string) => {
    updateFilters(size)
  }

  return (
    <Accordion heading="Size" defaultOpen={defaultOpen}>
      <ul className="grid grid-cols-4 mt-2 gap-2">
        {items.map(({ label }) => (
          <li key={label} className="mb-4">
            <Chip
              selected={isFilterActive(label)}
              onSelect={() => selectSizeHandler(label)}
              value={label}
              className="w-full !justify-center !py-2 !font-normal"
            />
          </li>
        ))}
      </ul>
    </Accordion>
  )
}

function PriceFilter({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [min, setMin] = useState("")
  const [max, setMax] = useState("")

  const updateSearchParams = useUpdateSearchParams()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMin(searchParams.get("min_price") || "")
    setMax(searchParams.get("max_price") || "")
  }, [searchParams])

  const updateMinPriceHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateSearchParams("min_price", min)
  }

  const updateMaxPriceHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    updateSearchParams("max_price", max)
  }

  return (
    <Accordion heading="Price" defaultOpen={defaultOpen}>
      <div className="flex gap-2 mb-4">
        <form method="POST" onSubmit={updateMinPriceHandler}>
          <Input
            placeholder="Min"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMin(e.target.value)
            }
            value={min}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              setTimeout(() => {
                updateMinPriceHandler(
                  e as unknown as React.FormEvent<HTMLFormElement>
                )
              }, 500)
            }}
            type="number"
            className="no-arrows-number-input"
          />
          <input type="submit" className="hidden" />
        </form>
        <form method="POST" onSubmit={updateMaxPriceHandler}>
          <Input
            placeholder="Max"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMax(e.target.value)
            }
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              setTimeout(() => {
                updateMaxPriceHandler(
                  e as unknown as React.FormEvent<HTMLFormElement>
                )
              }, 500)
            }}
            value={max}
            type="number"
            className="no-arrows-number-input"
          />
          <input type="submit" className="hidden" />
        </form>
      </div>
    </Accordion>
  )
}
