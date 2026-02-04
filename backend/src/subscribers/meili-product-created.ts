import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MeiliSearch } from "meilisearch";
import { toMeiliDoc, type ProductGraph } from "../utils/meili-doc";

export default async function meiliProductCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) return;

  try {
    const client = new MeiliSearch({ host, apiKey: apiKey || undefined });
    const index = client.index(indexName);

    const { data: products } = await query.graph({
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
      filters: { id: [data.id] },
    });

    const product = (products as ProductGraph[])?.[0];
    if (!product) return;

    await index.addDocuments([toMeiliDoc(product)]);
  } catch (e) {
    logger.warn(`[MEILI] product.created sync failed: ${String(e)}`);
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
};
