import { OrderParcels } from "@/components/organisms/OrderParcels/OrderParcels"
import { OrderTotals } from "@/components/organisms/OrderTotals/OrderTotals"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"

type OrderSetLike = {
  orders: Array<HttpTypes.StoreOrder & { seller: SellerProps }>
  shipping_total: number
  total: number
  payment_collection: { currency_code: string }
}

export const OrderDetailsSection = ({
  orderSet,
}: {
  orderSet: OrderSetLike
}) => {
  return (
    <div>
      <OrderParcels orders={orderSet.orders} />
      <OrderTotals orderSet={orderSet} />
      {/* <OrderAddresses /> */}
    </div>
  )
}
