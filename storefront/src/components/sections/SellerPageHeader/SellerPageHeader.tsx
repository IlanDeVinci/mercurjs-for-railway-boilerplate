import { SellerFooter, SellerHeading } from "@/components/organisms"
import { SellerProps } from "@/types/seller"
import { HttpTypes } from "@medusajs/types"

export const SellerPageHeader = ({
  header = false,
  seller,
  user,
}: {
  header?: boolean
  seller: SellerProps
  user: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="border rounded-sm p-4">
      <SellerHeading header={header} seller={seller} user={user} />
      <p
        dangerouslySetInnerHTML={{
          __html: seller.description,
        }}
        className="label-md my-5"
      />
      <SellerFooter seller={seller} />
    </div>
  )
}
