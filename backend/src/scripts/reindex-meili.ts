import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MeiliSearch } from "meilisearch";

type ProductGraph = {
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
    metadata?: Record<string, any> | null;
  }[];
};

function uniq(values: (string | undefined | null)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function getVariantOptionValue(variant: any, optionTitle: string) {
  const normalized = optionTitle.toLowerCase();
  const match = (variant?.options || []).find(
    (o: any) => String(o?.option?.title || "").toLowerCase() === normalized,
  );
  return match?.value || null;
}

function toMeiliDoc(product: ProductGraph) {
  const variants = product.variants || [];

  const variants_color = uniq([
    ...variants.map((v: any) => getVariantOptionValue(v, "color")),
    ...variants.map((v: any) => v?.metadata?.color),
  ]);
  const variants_size = uniq([
    ...variants.map((v: any) => getVariantOptionValue(v, "size")),
    ...variants.map((v: any) => v?.metadata?.size),
  ]);
  const variants_condition = uniq([
    ...variants.map((v: any) => getVariantOptionValue(v, "condition")),
    ...variants.map((v: any) => v?.metadata?.condition),
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

export default async function reindexMeili({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) {
    logger.info("[MEILI] MEILI_HOST not set, skipping reindex");
    return;
  }

  const client = new MeiliSearch({ host, apiKey: apiKey || undefined });
  const index = client.index(indexName);

  logger.info(`[MEILI] Reindexing '${indexName}' from database...`);

  const take = 200;
  let skip = 0;
  let total = 0;

  // Use the Query Graph to avoid tight coupling to module service APIs.
  while (true) {
    const { data, metadata } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "handle",
        "title",
        "subtitle",
        "thumbnail",
        "status",
        "tags.*",
        "categories.*",
        "brand.*",
        "collection.*",
        "seller.*",
        "variants.*",
        "variants.options.*",
        "variants.options.option.*",
      ],
      pagination: {
        take,
        skip,
      },
    });

    const products = (data as ProductGraph[]) || [];
    if (!products.length) break;

    const docs = products.map(toMeiliDoc);
    await index.addDocuments(docs);

    total += docs.length;
    skip += take;

    const next = metadata?.count
      ? total < metadata.count
      : products.length === take;
    if (!next) break;
  }

  logger.info(`[MEILI] Reindex complete. Indexed ${total} products.`);
}
