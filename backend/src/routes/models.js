import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";

const app = new Hono();

// Cache OpenRouter models for 1 hour to avoid repeated fetches
let openRouterCache = null;
let openRouterCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Google models — hardcoded (no public list API without auth)
const GOOGLE_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", context: 1048576 },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", context: 1048576 },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash Preview", context: 1048576 },
  { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro Preview", context: 2097152 },
];

/**
 * Fetch and filter OpenRouter models from their public API.
 * Returns both free and popular paid models, sorted by relevance.
 */
async function fetchOpenRouterModels() {
  // Check cache
  if (openRouterCache && Date.now() - openRouterCacheTime < CACHE_TTL) {
    return openRouterCache;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
    const data = await res.json();
    const allModels = data.data || [];

    // Build model list with useful metadata
    const models = allModels
      .map((m) => ({
        id: m.id,
        label: m.name || m.id,
        context: m.context_length || 0,
        isFree: (m.pricing?.prompt || "1") === "0" && (m.pricing?.completion || "1") === "0",
      }))
      .filter((m) => m.context > 0); // filter out junk

    // Sort: free models first, then by context length desc
    models.sort((a, b) => {
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return b.context - a.context;
    });

    openRouterCache = models;
    openRouterCacheTime = Date.now();
    return models;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error?.message);
    // Return fallback list if fetch fails
    return [
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        label: "Llama 3.3 70B Instruct (Free)",
        context: 131072,
        isFree: true,
      },
      {
        id: "google/gemma-4-31b-it:free",
        label: "Google Gemma 4 31B (Free)",
        context: 262144,
        isFree: true,
      },
      {
        id: "openai/gpt-oss-120b:free",
        label: "GPT-OSS 120B (Free)",
        context: 131072,
        isFree: true,
      },
      {
        id: "meta-llama/llama-3.2-3b-instruct:free",
        label: "Llama 3.2 3B Instruct (Free)",
        context: 131072,
        isFree: true,
      },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", context: 128000, isFree: false },
      {
        id: "anthropic/claude-3.5-haiku",
        label: "Claude 3.5 Haiku",
        context: 200000,
        isFree: false,
      },
    ];
  }
}

// ─── GET /api/models/:provider ─────────────────────────────────────────────
// Returns available models for a given provider

app.get("/:provider", requireAuth, async (c) => {
  const provider = c.req.param("provider");

  if (provider === "openrouter") {
    const models = await fetchOpenRouterModels();
    return c.json({ models });
  }

  if (provider === "google") {
    return c.json({
      models: GOOGLE_MODELS.map((m) => ({ ...m, isFree: false })),
    });
  }

  return c.json({ error: "Unknown provider" }, 400);
});

export default app;
