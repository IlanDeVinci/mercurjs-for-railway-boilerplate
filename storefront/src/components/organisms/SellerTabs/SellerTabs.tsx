import { Suspense } from "react"
import { ProductListingSkeleton } from "../ProductListingSkeleton/ProductListingSkeleton"
import { MeiliProductsListing, ProductListing } from "@/components/sections"
import { TabsContent, TabsList } from "@/components/molecules"
import { SellerReviewTab } from "@/components/cells"
import { getRegion } from "@/lib/data/regions"

export default {}
const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST

export const SellerTabs = ({
  tab,
  seller_handle,
  seller_id,
  locale,
  currency_code,
}: {
  tab: string
  seller_handle: string
  seller_id: string
  locale: string
  currency_code: string
}) => {
  const tabsList = [
    { label: "products", link: `/sellers/${seller_handle}/` },
    {
      label: "reviews",
      link: `/sellers/${seller_handle}/reviews`,
    },
  ]

  return (
    <div className="mt-8">
      <TabsList list={tabsList} activeTab={tab} />
      <TabsContent value="products" activeTab={tab}>
        <Suspense fallback={<ProductListingSkeleton />}>
          {MEILI_HOST ? (
            <MeiliProductsListing
              locale={locale}
              seller_handle={seller_handle}
              currency_code={currency_code}
            />
          ) : (
            <ProductListing showSidebar seller_id={seller_id} />
          )}
        </Suspense>
      </TabsContent>
      <TabsContent value="reviews" activeTab={tab}>
        <Suspense>
          <SellerReviewTab seller_handle={seller_handle} />
        </Suspense>
      </TabsContent>
    </div>
  )
}
