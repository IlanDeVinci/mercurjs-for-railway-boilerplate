"use client"

import { HttpTypes } from "@medusajs/types"
import {
  MeiliProductSidebar,
  ProductCard,
  ProductListingActiveFilters,
  ProductsPagination,
} from "@/components/organisms"
import { useSearchParams } from "next/navigation"
import { PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useMemo, useState } from "react"
import { listProducts } from "@/lib/data/products"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { getMeiliFilters } from "@/lib/helpers/get-meili-filters"

type MeiliSearchResponse = {
  hits: Array<Record<string, any>>
  estimatedTotalHits?: number
  totalHits?: number
  facetDistribution?: Record<string, Record<string, number>>
}

const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST
const MEILI_INDEX = process.env.NEXT_PUBLIC_MEILI_INDEX_PRODUCTS || "products"
const MEILI_SEARCH_KEY = process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY

function meiliSearch(params: {
  query: string
  filter?: string
  limit: number
  offset: number
  facets?: string[]
}) {
  if (!MEILI_HOST) {
    throw new Error("NEXT_PUBLIC_MEILI_HOST not configured")
  }

  return fetch(`${MEILI_HOST}/indexes/${MEILI_INDEX}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(MEILI_SEARCH_KEY ? { "X-Meili-API-Key": MEILI_SEARCH_KEY } : {}),
    },
    body: JSON.stringify({
      q: params.query,
      filter: params.filter,
      limit: params.limit,
      offset: params.offset,
      facets: params.facets,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Meili search failed (${res.status}): ${text}`)
    }
    return (await res.json()) as MeiliSearchResponse
  })
}

export const MeiliProductsListing = ({
  category_id,
  collection_id,
  seller_handle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
}: {
  category_id?: string
  collection_id?: string
  locale?: string
  seller_handle?: string
  currency_code: string
}) => {
  const searchParams = useSearchParams()

  const page = +(searchParams.get("page") || 1)
  const query = searchParams.get("query") || ""

  const filter = useMemo(() => {
    return getMeiliFilters(searchParams, {
      category_id,
      collection_id,
      seller_handle,
    })
  }, [searchParams, category_id, collection_id, seller_handle])

  const [meili, setMeili] = useState<MeiliSearchResponse | null>(null)
  const [apiProducts, setApiProducts] = useState<
    HttpTypes.StoreProduct[] | null
  >(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setMeili(null)
      setApiProducts(null)

      try {
        const offset = (page - 1) * PRODUCT_LIMIT
        const meiliRes = await meiliSearch({
          query,
          filter,
          limit: PRODUCT_LIMIT,
          offset,
          facets: ["variants_color", "variants_size", "variants_condition"],
        })

        if (cancelled) return

        const hits = (meiliRes.hits || []).map((h) => ({
          ...h,
          objectID: h.objectID || h.id,
        }))

        setMeili({ ...meiliRes, hits })

        const handles = hits
          .map((h: any) => h.handle)
          .filter(Boolean) as string[]

        if (!handles.length) {
          setApiProducts([])
          return
        }

        const { response } = await listProducts({
          countryCode: locale,
          queryParams: {
            fields:
              "*variants.calculated_price,*seller.reviews,-images,-type,-tags,-variants.options,-options,-collection,-collection_id",
            handle: handles,
            limit: handles.length,
          },
        })

        if (cancelled) return

        const valid = (response.products || []).filter((prod) => {
          const { cheapestPrice } = getProductPrice({ product: prod })
          return Boolean(cheapestPrice)
        })

        setApiProducts(valid)
      } catch {
        if (cancelled) return
        setMeili({ hits: [], estimatedTotalHits: 0 })
        setApiProducts([])
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [page, query, filter, locale])

  if (!meili || !apiProducts) return <ProductListingSkeleton />

  const total = meili.estimatedTotalHits ?? meili.totalHits ?? meili.hits.length
  const pages = Math.ceil((total || 0) / PRODUCT_LIMIT) || 1

  function filterProductsByCurrencyCode(product: HttpTypes.StoreProduct) {
    const minPrice = searchParams.get("min_price")
    const maxPrice = searchParams.get("max_price")

    if ([minPrice, maxPrice].some((price) => typeof price === "string")) {
      const variantsWithCurrencyCode = product?.variants?.filter(
        (variant) => variant.calculated_price?.currency_code === currency_code
      )

      if (!variantsWithCurrencyCode?.length) {
        return false
      }

      if (minPrice && maxPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) >= +minPrice &&
            (variant.calculated_price?.calculated_amount ?? 0) <= +maxPrice
        )
      }
      if (minPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) >= +minPrice
        )
      }
      if (maxPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) <= +maxPrice
        )
      }
    }

    return true
  }

  const apiById = new Map(apiProducts.map((p) => [p.id, p]))
  const products = (meili.hits || [])
    .filter((h: any) => apiById.has(h.objectID))
    .filter((h: any) => {
      const prod = apiById.get(h.objectID)
      return prod ? filterProductsByCurrencyCode(prod) : false
    })

  return (
    <div className="min-h-[70vh]">
      <div className="flex justify-between w-full items-center">
        <div className="my-4 label-md">{`${total || 0} listings`}</div>
      </div>
      <div className="hidden md:block">
        <ProductListingActiveFilters />
      </div>
      <div className="md:flex gap-4">
        <div className="w-full md:w-[280px] flex-shrink-0">
          <MeiliProductSidebar facetDistribution={meili.facetDistribution} />
        </div>
        <div className="w-full">
          {!products.length ? (
            <div className="text-center w-full my-10">
              <h2 className="uppercase text-primary heading-lg">no results</h2>
              <p className="mt-4 text-lg">
                Sorry, we can&apos;t find any results for your criteria
              </p>
            </div>
          ) : (
            <div className="w-full">
              <ul className="flex flex-wrap gap-4">
                {products.map((hit: any) => (
                  <ProductCard
                    api_product={apiById.get(hit.objectID)}
                    key={hit.objectID}
                    product={hit}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <ProductsPagination pages={pages} />
    </div>
  )
}
