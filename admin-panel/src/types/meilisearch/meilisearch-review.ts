import { z } from "zod";

export type MeilisearchReview = z.infer<typeof MeilisearchReviewValidator>;
export const MeilisearchReviewValidator = z.object({
  id: z.string(),
  reference: z.string(),
  reference_id: z.string(),
  rating: z.coerce.number(),
  customer_note: z.string().nullable(),
  seller_note: z.string().nullable(),
});
