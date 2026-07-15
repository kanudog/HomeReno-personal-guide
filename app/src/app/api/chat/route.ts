import { getAIProviderConfig } from "@/lib/ai/provider";

export async function POST() {
  const config = getAIProviderConfig();
  return Response.json(
    {
      error: "In-app chat is not enabled in this version.",
      hint: config
        ? "Provider is configured but the chat feature has not shipped yet."
        : "Set AI_BASE_URL, AI_API_KEY and AI_MODEL to prepare an OpenAI-compatible provider.",
    },
    { status: 501 },
  );
}
