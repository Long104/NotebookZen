/**
 * fetchWithRetry — wraps fetch() with automatic retry on cold-start failures.
 *
 * Cloudflare Workers free plan has a 10ms CPU limit. On cold starts, the
 * Worker may return a 500 or the fetch may fail entirely (net::ERR_FAILED).
 * The first request warms the Worker; the retry succeeds.
 *
 * Strategy:
 *   1. Try the request
 *   2. If it fails (500, network error, or CORS error from crashed Worker)
 *      → wait 1s, retry
 *   3. Up to 3 attempts total
 *   4. If all fail, throw the last error
 */
export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init)

      // If we get a 500, the Worker likely cold-started.
      // Retry — the Worker is now warm.
      if (response.status === 500 && attempt < maxRetries) {
        await sleep(1000)
        continue
      }

      return response
    } catch (error) {
      // Network error / CORS error / ERR_FAILED — Worker crashed on cold start.
      // The request still warmed the isolate, so retry should succeed.
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        await sleep(1000)
        continue
      }
    }
  }

  throw lastError || new Error("fetchWithRetry: all attempts failed")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
