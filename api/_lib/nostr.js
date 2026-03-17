import { verifyEvent } from 'nostr-tools'

const CHALLENGE_TTL_SECONDS = 300 // 5 minutes
const NIP98_KIND = 27235

/**
 * Verify a NIP-98 HTTP Auth event against a stored challenge.
 * Returns true only if:
 *   - event.kind === 27235
 *   - signature is cryptographically valid (secp256k1)
 *   - event was created within 5 minutes
 *   - event.content matches the challenge from DB
 *   - tags include the expected URL and method
 */
export function verifyAuthEvent(event, challenge) {
  if (!event || typeof event !== 'object') return false
  if (event.kind !== NIP98_KIND) return false
  if (!event.id || !event.sig || !event.pubkey) return false

  // Timestamp freshness
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - event.created_at) > CHALLENGE_TTL_SECONDS) return false

  // Tags: must have method=POST and a URL containing /api/auth/verify
  const tags = event.tags || []
  const uTag = tags.find(t => t[0] === 'u')
  const methodTag = tags.find(t => t[0] === 'method')
  if (!uTag || !methodTag) return false
  if (methodTag[1] !== 'POST') return false
  if (!uTag[1]?.includes('/api/auth/verify')) return false

  // Content must be the challenge
  if (event.content !== challenge) return false

  // Cryptographic secp256k1 signature verification
  try {
    return verifyEvent(event)
  } catch {
    return false
  }
}

export function isValidPubkey(pubkey) {
  return typeof pubkey === 'string' && /^[0-9a-f]{64}$/i.test(pubkey)
}
