/**
 * Embedding service using Cloudflare Workers AI.
 *
 * Model: @cf/baai/bge-base-en-v1.5 (768 dimensions)
 * Free tier, no API key needed. Accessible via c.env.AI binding.
 *
 * Two functions:
 *   embedNote(ai, title, content) → 768-dim vector for storage
 *   embedQuery(ai, text)          → 768-dim vector for similarity search
 */

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5"
const VECTOR_DIMS = 768

/**
 * Truncate content to fit within the model's context window.
 * bge-base handles ~512 tokens ≈ ~2000 characters.
 * We keep title + first 1500 chars of content.
 */
function buildEmbeddingText(title, content) {
  const truncated = (content || "").slice(0, 1500)
  return `${title}\n${truncated}`
}

/**
 * Generate an embedding vector for a note.
 *
 * @param {Fetcher} ai — Workers AI binding (c.env.AI)
 * @param {string} title — note title
 * @param {string} content — note content (markdown)
 * @returns {Promise<number[] | null>} 768-dim vector, or null on failure
 */
export async function embedNote(ai, title, content) {
  const text = buildEmbeddingText(title, content)
  return embedText(ai, text)
}

/**
 * Generate an embedding vector for a search query.
 *
 * @param {Fetcher} ai — Workers AI binding (c.env.AI)
 * @param {string} query — user's question
 * @returns {Promise<number[] | null>} 768-dim vector, or null on failure
 */
export async function embedQuery(ai, query) {
  return embedText(ai, query)
}

/**
 * Core embedding function. Calls Workers AI and extracts the vector.
 * Returns null on any error so callers can gracefully fall back.
 *
 * @param {Fetcher} ai — Workers AI binding
 * @param {string} text — text to embed
 * @returns {Promise<number[] | null>}
 */
async function embedText(ai, text) {
  if (!ai) return null
  if (!text || !text.trim()) return null

  try {
    const result = await ai.run(EMBEDDING_MODEL, { text })

    // Workers AI returns { shape: [1, 768], data: [[...]] }
    if (result?.data && Array.isArray(result.data[0])) {
      return result.data[0]
    }
    // Some versions return a flat array
    if (result?.data && result.data.length === VECTOR_DIMS) {
      return result.data
    }

    console.error("Unexpected embedding response shape:", result?.shape)
    return null
  } catch (error) {
    console.error("Embedding generation failed:", error?.message || error)
    return null
  }
}

export { VECTOR_DIMS, EMBEDDING_MODEL }
