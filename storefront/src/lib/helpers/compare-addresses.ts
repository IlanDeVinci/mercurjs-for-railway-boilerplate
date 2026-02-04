import { isEqual, pick } from "lodash"

type AddressLike = Record<string, unknown>

export default function compareAddresses(
  address1: AddressLike,
  address2: AddressLike
) {
  return isEqual(
    pick(address1, [
      "first_name",
      "last_name",
      "address_1",
      "city",
      "country_code",
    ]),
    pick(address2, [
      "first_name",
      "last_name",
      "address_1",
      "city",
      "country_code",
    ])
  )
}
