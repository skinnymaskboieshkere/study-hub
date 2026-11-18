import { z } from "zod";

/** Response of GET /api/health. */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
