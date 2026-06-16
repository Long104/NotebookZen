/**
 * Zero-dependency Clerk JWT verification using the Web Crypto API.
 *
 * Clerk session tokens are standard RS256 JWTs. We don't need the 50KB+
 * @clerk/backend SDK to verify them — Workers have crypto.subtle built in.
 *
 * Flow:
 *   1. Decode JWT → header + payload + signature
 *   2. Fetch Clerk's public keys (JWKS) — cached for 1 hour
 *   3. Verify signature with crypto.subtle.verify()
 *   4. Check expiry
 *
 * @module lib/jwt
 */

// ─── JWKS cache ────────────────────────────────────────────────────────────
// Keyed by issuer URL. Keys rotate infrequently, so a 1-hour TTL is safe.
const jwksCache = new Map()
const JWKS_TTL = 60 * 60 * 1000 // 1 hour

async function fetchJWKS(iss) {
  const cached = jwksCache.get(iss)
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL) {
    return cached.keys
  }

  // Standard OIDC JWKS endpoint: {issuer}/.well-known/jwks.json
  const url = `${iss.replace(/\/$/, "")}/.well-known/jwks.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${url}: ${res.status}`)
  }
  const { keys } = await res.json()
  jwksCache.set(iss, { keys, fetchedAt: Date.now() })
  return keys
}

// ─── Base64URL helpers ─────────────────────────────────────────────────────

function base64UrlToBytes(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── Decode JWT (no verification) ──────────────────────────────────────────

function decodeJWT(token) {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 parts")
  }

  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])))
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])))
  const signature = base64UrlToBytes(parts[2])

  return { header, payload, signature, raw: `${parts[0]}.${parts[1]}` }
}

// ─── Verify JWT signature ──────────────────────────────────────────────────

async function verifySignature(header, signature, signingInput, keys) {
  // Find the key that matches this token's kid
  const jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) {
    throw new Error(`No matching key for kid: ${header.kid}`)
  }

  // Import the RSA public key into Web Crypto
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  )

  // Verify: RSASSA-PKCS1-v1_5 with SHA-256
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    new TextEncoder().encode(signingInput),
  )

  if (!valid) {
    throw new Error("Invalid JWT signature")
  }
}

// ─── Public API: verify a Clerk session token ──────────────────────────────

/**
 * Verify a Clerk JWT session token using the Web Crypto API.
 *
 * @param {string} token — the raw JWT from the Authorization header
 * @returns {Promise<object>} — the decoded JWT payload (includes `sub` = user ID)
 */
export async function verifyToken(token) {
  // 1. Decode
  const { header, payload, signature, raw } = decodeJWT(token)

  // 2. Check algorithm
  if (header.alg !== "RS256") {
    throw new Error(`Unexpected JWT algorithm: ${header.alg}`)
  }

  // 3. Check expiry
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired")
  }

  // 4. Fetch JWKS + verify signature
  const iss = payload.iss
  if (!iss) {
    throw new Error("Token missing issuer (iss claim)")
  }

  const keys = await fetchJWKS(iss)
  await verifySignature(header, signature, raw, keys)

  // 5. Return payload (sub = Clerk user ID)
  return payload
}
