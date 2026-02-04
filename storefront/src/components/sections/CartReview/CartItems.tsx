import { CartItemsHeader, CartItemsProducts } from "@/components/cells"
import { HttpTypes } from "@medusajs/types"
import { SellerProps } from "@/types/seller"

export const CartItems = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  if (!cart) return null

  const groupedItems = groupItemsBySeller(cart)

  return Object.keys(groupedItems).map((key) => (
    <div key={key} className="mb-4">
      <CartItemsHeader seller={groupedItems[key]?.seller} />
      <CartItemsProducts
        delete_item={false}
        products={groupedItems[key].items || []}
        currency_code={cart.currency_code}
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
