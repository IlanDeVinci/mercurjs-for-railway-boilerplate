import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MeiliSearch } from "meilisearch";
import { toMeiliDoc, type ProductGraph } from "../utils/meili-doc";

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
