import { z } from "zod";

export const cardSchema = z.object({
  title: z.string(),
  version: z.number(),
  stage: z.string(),
  when: z.array(z.string()),
  then: z.array(z.string()),
  against: z.string(),
  limits: z.string(),
});
export type Card = z.infer<typeof cardSchema>;

export const replaySchema = z.object({
  considered: z.number(),
  skipped: z.number(),
  fires: z.number(),
  right: z.number(),
  brier: z.number().nullable(),
  against: z.object({ name: z.string(), brier: z.number().nullable(), compared: z.number() }),
  closingLines: z.number(),
  days: z.array(z.object({ day: z.string(), fires: z.number(), right: z.number() })),
  recent: z.array(
    z.object({
      at: z.string(),
      label: z.string(),
      pick: z.string(),
      confidence: z.number(),
      right: z.boolean(),
    }),
  ),
});
export type Replay = z.infer<typeof replaySchema>;
