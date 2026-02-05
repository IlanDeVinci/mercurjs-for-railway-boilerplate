import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const safeRun = async <T>(label: string, fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`${label} skipped: ${message}`);
      return null as T | null;
    }
  };

  const countries = ["us", "ca", "gb", "de", "fr", "es", "it"];

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id"],
    filters: {},
    pagination: {
      take: 1,
    },
  });

  const shouldSeedFromScratch = existingRegions.length === 0;

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container,
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "usd",
            is_default: true,
          },
          {
            currency_code: "eur",
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  let regions: Array<{ id: string }> = [];
  if (shouldSeedFromScratch) {
    logger.info("Seeding region data...");
    const regionResult = await safeRun("Region seed", async () => {
      return createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "North America",
              currency_code: "usd",
              countries: ["us", "ca"],
              payment_providers: ["pp_system_default"],
            },
            {
              name: "Europe",
              currency_code: "eur",
              countries: ["gb", "de", "fr", "es", "it"],
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      });
    });
    regions = regionResult?.result ?? [];
    logger.info("Finished seeding regions.");
  }

  if (!regions.length) {
    const { data: existingRegionList } = await query.graph({
      entity: "region",
      fields: ["id"],
    });
    regions = existingRegionList;
  }

  logger.info("Seeding tax regions...");
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: {
      country_code: countries,
    },
  });
  const existingTaxCodes = new Set(
    existingTaxRegions.map((region) => region.country_code),
  );
  const missingTaxRegions = countries.filter(
    (country_code) => !existingTaxCodes.has(country_code),
  );
  if (missingTaxRegions.length) {
    await safeRun("Tax region seed", async () => {
      return createTaxRegionsWorkflow(container).run({
        input: missingTaxRegions.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
      });
    });
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { data: existingStockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  let stockLocation = existingStockLocations.find(
    (location) => location.name === "Main Warehouse",
  );

  if (!stockLocation) {
    const stockLocationResult = await safeRun(
      "Stock location seed",
      async () => {
        return createStockLocationsWorkflow(container).run({
          input: {
            locations: [
              {
                name: "Main Warehouse",
                address: {
                  city: "New York",
                  country_code: "US",
                  address_1: "",
                },
              },
            ],
          },
        });
      },
    );
    stockLocation = stockLocationResult?.result?.[0] ?? null;
  }

  if (!stockLocation) {
    logger.warn("No stock location available, skipping fulfillment setup.");
    return;
  }

  await safeRun("Stock location fulfillment link", async () => {
    return link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const { data: existingFulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id"],
  });
  let fulfillmentSet = existingFulfillmentSets.find(
    (set) => set.name === "Main Warehouse delivery",
  );

  if (!fulfillmentSet) {
    fulfillmentSet = await safeRun("Fulfillment set seed", async () => {
      return fulfillmentModuleService.createFulfillmentSets({
        name: "Main Warehouse delivery",
        type: "shipping",
        service_zones: [
          {
            name: "Global",
            geo_zones: countries.map((country_code) => ({
              country_code,
              type: "country" as const,
            })),
          },
        ],
      });
    });
  }

  if (!fulfillmentSet) {
    logger.warn("No fulfillment set available, skipping shipping options.");
    return;
  }

  await safeRun("Stock location fulfillment set link", async () => {
    return link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  });

  const serviceZoneId = fulfillmentSet.service_zones?.[0]?.id;
  if (serviceZoneId) {
    await safeRun("Shipping options seed", async () => {
      return createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "Standard Shipping",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Standard",
              description: "Ship in 5-7 business days.",
              code: "standard",
            },
            prices: [
              {
                currency_code: "usd",
                amount: 10,
              },
              {
                currency_code: "eur",
                amount: 10,
              },
              ...regions.map((region) => ({
                region_id: region.id,
                amount: 10,
              })),
            ],
            rules: [
              {
                attribute: "enabled_in_store",
                value: "true",
                operator: "eq",
              },
              {
                attribute: "is_return",
                value: "false",
                operator: "eq",
              },
            ],
          },
          {
            name: "Express Shipping",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Express",
              description: "Ship in 2-3 business days.",
              code: "express",
            },
            prices: [
              {
                currency_code: "usd",
                amount: 20,
              },
              {
                currency_code: "eur",
                amount: 20,
              },
              ...regions.map((region) => ({
                region_id: region.id,
                amount: 20,
              })),
            ],
            rules: [
              {
                attribute: "enabled_in_store",
                value: "true",
                operator: "eq",
              },
              {
                attribute: "is_return",
                value: "false",
                operator: "eq",
              },
            ],
          },
        ],
      });
    });
  } else {
    logger.warn("No service zone available, skipping shipping options.");
  }
  logger.info("Finished seeding fulfillment data.");

  await safeRun("Sales channel stock location link", async () => {
    return linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  const { data: existingApiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type"],
    filters: {
      title: "Webshop",
      type: "publishable",
    },
  });
  let publishableApiKey = existingApiKeys[0];
  if (!publishableApiKey) {
    const publishableApiKeyResult = await safeRun(
      "Publishable API key seed",
      async () => {
        return createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: "Webshop",
                type: "publishable",
                created_by: "",
              },
            ],
          },
        });
      },
    );
    publishableApiKey = publishableApiKeyResult?.result?.[0];
  }

  if (publishableApiKey) {
    await safeRun("Sales channel API key link", async () => {
      return linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: publishableApiKey.id,
          add: [defaultSalesChannel[0].id],
        },
      });
    });
  }
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product categories...");
  let { data: categoryResult } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  if (!categoryResult.length) {
    const createdCategories = await safeRun(
      "Product categories seed",
      async () => {
        return createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              {
                name: "Apparel",
                is_active: true,
              },
              {
                name: "Electronics",
                is_active: true,
              },
              {
                name: "Home & Garden",
                is_active: true,
              },
            ],
          },
        });
      },
    );
    categoryResult = createdCategories?.result ?? categoryResult;
  }
  logger.info("Finished seeding product categories.");

  logger.info("Seeding sample products...");
  const { data: existingSampleProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: {
      handle: "sample-product",
    },
  });
  if (!existingSampleProducts.length) {
    const apparelCategoryId = categoryResult.find(
      (category) => category.name === "Apparel",
    )?.id;
    if (apparelCategoryId) {
      await safeRun("Sample product seed", async () => {
        return createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Sample Product",
                category_ids: [apparelCategoryId],
                description:
                  "This is a sample product for your marketplace. Replace it with real products.",
                handle: "sample-product",
                weight: 500,
                status: ProductStatus.PUBLISHED,
                shipping_profile_id: shippingProfile.id,
                options: [
                  {
                    title: "Size",
                    values: ["S", "M", "L"],
                  },
                ],
                variants: [
                  {
                    title: "Small",
                    sku: "SAMPLE-S",
                    options: {
                      Size: "S",
                    },
                    prices: [
                      {
                        amount: 29.99,
                        currency_code: "usd",
                      },
                      {
                        amount: 24.99,
                        currency_code: "eur",
                      },
                    ],
                  },
                  {
                    title: "Medium",
                    sku: "SAMPLE-M",
                    options: {
                      Size: "M",
                    },
                    prices: [
                      {
                        amount: 29.99,
                        currency_code: "usd",
                      },
                      {
                        amount: 24.99,
                        currency_code: "eur",
                      },
                    ],
                  },
                  {
                    title: "Large",
                    sku: "SAMPLE-L",
                    options: {
                      Size: "L",
                    },
                    prices: [
                      {
                        amount: 29.99,
                        currency_code: "usd",
                      },
                      {
                        amount: 24.99,
                        currency_code: "eur",
                      },
                    ],
                  },
                ],
                sales_channels: [
                  {
                    id: defaultSalesChannel[0].id,
                  },
                ],
              },
            ],
          },
        });
      });
    } else {
      logger.warn("No Apparel category found, skipping sample product.");
    }
  }
  logger.info("Finished seeding products.");

  logger.info("Seeding inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 100,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  if (inventoryLevels.length) {
    await safeRun("Inventory levels seed", async () => {
      return createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: inventoryLevels,
        },
      });
    });
  }

  logger.info("Finished seeding inventory levels.");
  logger.info("✅ Database seeding completed successfully!");
}
