/**
 * Provider-agnostic AI configuration seam.
 *
 * V1 ships with no in-app AI (Claude Code is the external companion).
 * A later phase adds an in-app chat backed by any OpenAI-compatible
 * endpoint (e.g. z.ai GLM). Configure via environment only:
 *
 *   AI_BASE_URL  e.g. https://api.z.ai/api/coding/paas/v4
 *   AI_API_KEY   secret
 *   AI_MODEL     e.g. glm-5.2
 */
export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function getAIProviderConfig(): AIProviderConfig | null {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}
