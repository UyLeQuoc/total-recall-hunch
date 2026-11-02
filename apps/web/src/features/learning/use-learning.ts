import { useEffect, useState } from "react";
import { z } from "zod";
import { ApiError, fetchJson } from "@/lib/api";

const learningSchema = z.object({
  curve: z.array(
    z.object({
      at: z.string(),
      n: z.number(),
      call: z.number(),
      plain: z.number(),
      books: z.number().nullable(),
    }),
  ),
  voices: z.array(
    z.object({
      voice: z.string(),
      n: z.number(),
      brier: z.number(),
      hit: z.number(),
      trend: z.string(),
    }),
  ),
  trust: z.array(
    z.object({
      voice: z.string(),
      n: z.number(),
      brier: z.number(),
      memoryId: z.string(),
      blobId: z.string().nullable(),
    }),
  ),
  memories: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      status: z.string(),
      blobId: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export type Learning = z.infer<typeof learningSchema>;

export function useLearning() {
  const [data, setData] = useState<Learning | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    fetchJson("/api/learning", learningSchema)
      .then((d) => {
        if (!stop) setData(d);
      })
      .catch((err: unknown) => {
        if (!stop)
          setProblem(err instanceof ApiError ? err.message : "The learning chart didn't load.");
      });
    return () => {
      stop = true;
    };
  }, []);
  return { data, problem };
}
