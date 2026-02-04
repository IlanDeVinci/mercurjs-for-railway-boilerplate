import {
  CartItemsFooter,
  CartItemsHeader,
  CartItemsProducts,
} from "@/components/cells"
import { HttpTypes } from "@medusajs/types"
import { EmptyCart } from "./EmptyCart"
import { SellerProps } from "@/types/seller"

export const CartItems = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  if (!cart) return null

  const groupedItems = groupItemsBySeller(cart)

  if (!Object.keys(groupedItems).length) return <EmptyCart />

  return Object.keys(groupedItems).map((key) => (
    <div key={key} className="mb-4">
      <CartItemsHeader seller={groupedItems[key]?.seller} />
      <CartItemsProducts
        products={groupedItems[key].items || []}
        currency_code={cart.currency_code}
      />
      <CartItemsFooter
        currency_code={cart.currency_code}
        price={cart.shipping_subtotal}
      />
    </div>
  ))
}

type GroupedBySeller = Record<
  string,
  { seller: SellerProps; items: HttpTypes.StoreCartLineItem[] }
>

function groupItemsBySeller(cart: HttpTypes.StoreCart): GroupedBySeller {
  const groupedBySeller: GroupedBySeller = {}

  cart.items?.forEach((item) => {
    const seller = item.product?.seller as SellerProps | undefined
    if (seller) {
      if (!groupedBySeller[seller.id]) {
        groupedBySeller[seller.id] = {
          seller: seller,
          items: [],
        }
      }
      groupedBySeller[seller.id].items.push(item)
    } else {
      if (!groupedBySeller["fleek"]) {
        groupedBySeller["fleek"] = {
          seller: {
            name: "Fleek",
            id: "fleek",
            photo: "/Logo.svg",
            created_at: new Date().toISOString(),
          },
          items: [],
        }
      }
      groupedBySeller["fleek"].items.push(item)
    }
  })

  return groupedBySeller
}
