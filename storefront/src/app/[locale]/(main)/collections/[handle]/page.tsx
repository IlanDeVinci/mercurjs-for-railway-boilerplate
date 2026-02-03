import NotFound from "@/app/not-found"
import { Breadcrumbs } from "@/components/atoms"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { MeiliProductsListing, ProductListing } from "@/components/sections"
import { getCollectionByHandle } from "@/lib/data/collections"
import { getRegion } from "@/lib/data/regions"
import isBot from "@/lib/helpers/isBot"
import { Suspense } from "react"
import { headers } from "next/headers"

const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST

const SingleCollectionsPage = async ({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) => {
  const { handle, locale } = await params

  const ua = (await headers()).get("user-agent") || ""
  const bot = isBot(ua)
  const collection = await getCollectionByHandle(handle)

  if (!collection) return <NotFound />

  const currency_code = (await getRegion(locale))?.currency_code || "usd"

  const breadcrumbsItems = [
    {
      path: collection.handle,
      label: collection.title,
    },
  ]

  return (
    <main className="container">
      <div className="hidden md:block mb-2">
        <Breadcrumbs items={breadcrumbsItems} />
      </div>

      <h1 className="heading-xl uppercase">{collection.title}</h1>

      <Suspense fallback={<ProductListingSkeleton />}>
        {bot ? (
          <ProductListing collection_id={collection.id} showSidebar />
        ) : MEILI_HOST ? (
          <MeiliProductsListing
            collection_id={collection.id}
            locale={locale}
            currency_code={currency_code}
          />
        ) : (
          <ProductListing collection_id={collection.id} showSidebar />
        )}
      </Suspense>
    </main>
  )
}

export default SingleCollectionsPage
