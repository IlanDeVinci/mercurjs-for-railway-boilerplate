import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MeiliSearch } from "meilisearch";

export default async function meiliProductDeleted({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) return;

  try {
    const client = new MeiliSearch({ host, apiKey: apiKey || undefined });
    const index = client.index(indexName);
    await index.deleteDocument(data.id);
  } catch (e) {
    logger.warn(`[MEILI] product.deleted sync failed: ${String(e)}`);
  }
}

export const config: SubscriberConfig = {
  event: "product.deleted",
};
