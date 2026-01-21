import { z } from "zod";

export const ingestionRowSchema = z.object({
  location: z.string().trim().min(1),
  visitDate: z.date(),
  composters: z.number().int().nonnegative(),
  wetWasteKg: z.number().nonnegative(),
  brownWasteKg: z.number().nonnegative(),
  leachateL: z.number().nonnegative(),
  harvestKg: z.number().nonnegative(),
});

export type IngestionRowInput = z.infer<typeof ingestionRowSchema>;

