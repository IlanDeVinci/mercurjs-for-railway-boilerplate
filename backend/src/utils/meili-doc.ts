export type ProductGraph = {
  id: string;
  handle?: string;
  title?: string;
  subtitle?: string;
  thumbnail?: string | null;
  status?: string;
  tags?: { value?: string }[];
  categories?: { id: string; name?: string }[];
  brand?: { name?: string } | null;
  collection?: { id: string; title?: string } | null;
  seller?: { id: string; handle?: string; store_status?: string } | null;
  variants?: {
    id: string;
    title?: string;
    options?: { option?: { title?: string } | null; value?: string }[];
    metadata?: Record<string, unknown> | null;
  }[];
};

function uniq(values: (string | undefined | null)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

type VariantGraph = NonNullable<ProductGraph["variants"]>[number];

function getVariantOptionValue(
  variant: VariantGraph | null | undefined,
  optionTitle: string,
) {
  const normalized = optionTitle.toLowerCase();
  const match = (variant?.options || []).find(
    (o) => String(o?.option?.title || "").toLowerCase() === normalized,
  );
  return match?.value || null;
}

function getVariantMetadataValue(
  variant: VariantGraph | null | undefined,
  key: string,
) {
  const value = variant?.metadata?.[key];
  return typeof value === "string" ? value : null;
}

export function toMeiliDoc(product: ProductGraph) {
  const variants = product.variants || [];

  const variants_color = uniq([
    ...variants.map((v) => getVariantOptionValue(v, "color")),
    ...variants.map((v) => getVariantMetadataValue(v, "color")),
  ]);
  const variants_size = uniq([
    ...variants.map((v) => getVariantOptionValue(v, "size")),
    ...variants.map((v) => getVariantMetadataValue(v, "size")),
  ]);
  const variants_condition = uniq([
    ...variants.map((v) => getVariantOptionValue(v, "condition")),
    ...variants.map((v) => getVariantMetadataValue(v, "condition")),
  ]);

  return {
    id: product.id,
    objectID: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    thumbnail: product.thumbnail || null,
    status: product.status,
    tags: (product.tags || []).map((t) => t.value).filter(Boolean),
    brand_name: product.brand?.name || null,
    categories_id: (product.categories || []).map((c) => c.id),
    categories_name: (product.categories || [])
      .map((c) => c.name)
      .filter(Boolean),
    collection_id: product.collection?.id || null,
    collection_title: product.collection?.title || null,
    seller_handle: product.seller?.handle || null,
    seller_store_status: product.seller?.store_status || null,
    variants_title: variants.map((v) => v.title).filter(Boolean),
    variants_color,
    variants_size,
    variants_condition,
  };
}
