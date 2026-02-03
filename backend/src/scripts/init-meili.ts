import { MeiliSearch } from "meilisearch";

async function initMeili() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY || process.env.MEILI_MASTER_KEY;
  const indexName = process.env.MEILI_INDEX_PRODUCTS || "products";

  if (!host) {
    console.log("[MEILI] MEILI_HOST not set, skipping index initialization");
    return;
  }

  const client = new MeiliSearch({ host, apiKey: apiKey || undefined });

  try {
    const indexes = await client.getIndexes();
    const exists = indexes.results?.some((idx) => idx.uid === indexName);

    if (!exists) {
      console.log(`[MEILI] Creating index '${indexName}'...`);
      await client.createIndex(indexName, { primaryKey: "id" });
    } else {
      console.log(`[MEILI] Index '${indexName}' already exists`);
    }

    const index = client.index(indexName);

    // Settings are intentionally conservative and match the storefront's current
    // filter/refinement usage (color/size/condition + free-text search).
    await index.updateSettings({
      searchableAttributes: [
        "title",
        "subtitle",
        "brand_name",
        "categories_name",
        "tags",
        "variants_title",
      ],
      filterableAttributes: [
        "variants_color",
        "variants_size",
        "variants_condition",
        "categories_id",
        "collection_id",
        "status",
        "seller_handle",
        "seller_store_status",
      ],
      displayedAttributes: ["*"],
    });

    console.log(`[MEILI] Index '${indexName}' initialized`);
  } catch (error) {
    console.error("[MEILI] Failed to initialize index:", error);
    // Don't crash startup in dev; search will simply be unavailable.
  }
}

initMeili()
  .then(() => {
    console.log("[MEILI] Initialization complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[MEILI] Initialization failed:", error);
    process.exit(0);
  });
