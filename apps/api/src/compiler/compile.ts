import { compileByModel } from "./model.ts";
import { type CompileResult, compileByPattern } from "./patterns.ts";

export interface CompilerConfig {
  apiKey: string | undefined;
  model: string;
}

export async function compileHunch(
  hunch: string,
  today: Date,
  config: CompilerConfig,
  onModelError: (reason: string) => void,
): Promise<CompileResult> {
  if (config.apiKey) {
    try {
      return await compileByModel(hunch, today, config.apiKey, config.model);
    } catch (err) {
      onModelError(err instanceof Error ? err.message : String(err));
    }
  }
  const byPattern = compileByPattern(hunch, today);
  if (byPattern) return byPattern;
  return {
    kind: "refused",
    reason: config.apiKey
      ? "Hunch couldn't compile that one. Name the league (NBA or BTC), the sources and the gap or move, like the examples."
      : "No model key is set (OPENROUTER_API_KEY), so only hunches shaped like the examples compile. Try one of them.",
  };
}
