import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MeiliSearch } from "meilisearch";
import { toMeiliDoc, type ProductGraph } from "../../../utils/meili-doc";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) {
    return res.json({ appId: "meilisearch", productIndex: false });
  }

  try {
    const client = new MeiliSearch({ host, apiKey: apiKey || undefined });
    const indexes = await client.getIndexes();
    const exists = indexes.results?.some((idx) => idx.uid === indexName);

    return res.json({ appId: "meilisearch", productIndex: Boolean(exists) });
  } catch {
    return res.json({ appId: "meilisearch", productIndex: false });
  }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) {
    return res.status(400).json({ message: "MEILI_HOST not configured" });
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const client = new MeiliSearch({ host, apiKey: apiKey || undefined });
    const index = client.index(indexName);

    const take = 200;
    let skip = 0;
    let total = 0;

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
        pagination: { take, skip },
      });

      const products = (data as ProductGraph[]) || [];
      if (!products.length) break;

      const docs = products.map(toMeiliDoc);
      await index.addDocuments(docs);

      total += docs.length;
      skip += take;

      const hasMore = metadata?.count
        ? total < metadata.count
        : products.length === take;
      if (!hasMore) break;
    }

    logger.info(`[MEILI] Reindexed ${total} products via admin endpoint`);
    return res.json({ ok: true, indexed: total });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[MEILI] Reindex failed: ${message}`);
    return res.status(500).json({ message: "Reindex failed" });
  }
};
