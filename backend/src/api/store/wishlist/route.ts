import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  isPresent,
  QueryContext,
} from "@medusajs/framework/utils";

type WishlistProduct = {
  id: string;
};

type WishlistEntity = {
  products?: WishlistProduct[];
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.json({ products: [], count: 0, offset: 0, limit: 0 });
  }

  let wishlist: WishlistEntity | undefined;
  try {
    const result = await query.graph({
      entity: "wishlist",
      fields: ["products.id"],
      filters: {
        customer_id: customerId,
      },
    });
    wishlist = result.data?.[0];
  } catch {
    wishlist = undefined;
  }

  const productIds = (wishlist?.products || [])
    .map((product) => product.id)
    .filter(Boolean);

  if (productIds.length === 0) {
    return res.json({ products: [], count: 0, offset: 0, limit: 0 });
  }

  let context = {};
  if (isPresent(req.pricingContext)) {
    const pricingContext = { ...req.pricingContext, customer_id: customerId };
    context = {
      variants: {
        calculated_price: QueryContext(pricingContext),
      },
    };
  }

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig?.fields || ["*"],
    filters: {
      id: productIds,
    },
    pagination: req.queryConfig?.pagination,
    context,
  });

  return res.json({
    products,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  });
}
