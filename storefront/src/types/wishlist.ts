import { HttpTypes } from "@medusajs/types"

export default {}
export type Wishlist = {
  id: string
  products: HttpTypes.StoreProduct[]
}
