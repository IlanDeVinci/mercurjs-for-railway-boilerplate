import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.status(200).json({ status: "ok" });
};
