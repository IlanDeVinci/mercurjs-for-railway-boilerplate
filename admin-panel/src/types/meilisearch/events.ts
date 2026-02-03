export enum MeilisearchEvents {
  PRODUCTS_CHANGED = "meilisearch.products.changed",
  PRODUCTS_DELETED = "meilisearch.products.deleted",
  REVIEW_CHANGED = "meilisearch.reviews.changed",
}

export enum MeilisearchIntermediateEvents {
  FULFILLMENT_SET_CHANGED = "meilisearch.intermediate.fulfillment_set.changed",
  SERVICE_ZONE_CHANGED = "meilisearch.intermediate.service_zone.changed",
  SHIPPING_OPTION_CHANGED = "meilisearch.intermediate.shipping_option.changed",
  STOCK_LOCATION_CHANGED = "meilisearch.intermediate.stock_location.changed",
  INVENTORY_ITEM_CHANGED = "meilisearch.intermediate.inventory_item.changed",
}
