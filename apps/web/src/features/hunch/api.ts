import { z } from "zod";
import { cardSchema, replaySchema } from "@/lib/rule-schemas";

export type { Card, Replay } from "@/lib/rule-schemas";

const scope = z.object({ league: z.tuple([z.string()]) });

export const hunchEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), text: z.string() }),
  z.object({
    type: z.literal("rule"),
    id: z.string(),
    card: cardSchema,
    compiledBy: z.string(),
    rule: z.object({ scope }),
  }),
  z.object({ type: z.literal("replay"), replay: replaySchema }),
  z.object({ type: z.literal("question"), question: z.string() }),
  z.object({ type: z.literal("refused"), reason: z.string() }),
]);
export type HunchEvent = z.infer<typeof hunchEventSchema>;

export const pickSchema = z.object({
  id: z.string(),
  side: z.string(),
  confidence: z.number(),
  why: z.string(),
  pickedAt: z.string(),
  expiresAt: z.string(),
  entryPrice: z.number().nullable(),
  exitPrice: z.number().nullable(),
  exitAt: z.string().nullable(),
  outcome: z.enum(["pending", "right", "wrong"]),
  brier: z.number().nullable(),
});
export type Pick = z.infer<typeof pickSchema>;

export const practiceSchema = z.object({ pick: pickSchema, ruleId: z.string(), card: cardSchema });
export const pickResponseSchema = z.object({ pick: pickSchema });

export const btcSchema = z.object({
  price: z.number(),
  at: z.string(),
  minutes: z.array(
    z.object({
      at: z.string(),
      open: z.number(),
      high: z.number(),
      low: z.number(),
      close: z.number(),
    }),
  ),
});
export type Btc = z.infer<typeof btcSchema>;
