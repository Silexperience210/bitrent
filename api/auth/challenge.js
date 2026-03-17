import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { isValidPubkey } from '../_lib/nostr.js'
import crypto from 'crypto'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_PER_PUBKEY = 5   // per 5 min window
const MAX_PER_IP = 30      // per 5 min window

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pubkey } = req.body || {}
  if (!isValidPubkey(pubkey)) {
    return res.status(400).json({ error: 'Invalid pubkey: must be 64 lowercase hex chars' })
  }

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown'
  const windowStart = new Date(Date.now() - CHALLENGE_TTL_MS).toISOString()

  // Rate limit by pubkey (queried from DB)
  const { count: pubkeyCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('pubkey_nostr', pubkey)
    .gt('created_at', windowStart)

  if (pubkeyCount >= MAX_PER_PUBKEY) {
    return res.status(429).json({ error: 'Too many requests for this pubkey. Try again in 5 minutes.' })
  }

  // Rate limit by IP (migration 006 added ip_address column)
  const { count: ipCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', clientIp)
    .gt('created_at', windowStart)

  if (ipCount >= MAX_PER_IP) {
    return res.status(429).json({ error: 'Too many requests from this IP. Try again in 5 minutes.' })
  }

  // Remove stale expired challenges for this pubkey
  await supabase
    .from('challenges')
    .delete()
    .eq('pubkey_nostr', pubkey)
    .lt('expires_at', new Date().toISOString())

  const challenge = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()

  const { error } = await supabase.from('challenges').insert({
    challenge,
    pubkey_nostr: pubkey,
    expires_at: expiresAt,
    ip_address: clientIp,
  })

  if (error) {
    console.error('[challenge] DB error:', error.message)
    return res.status(500).json({ error: 'Failed to create challenge' })
  }

  return res.status(200).json({ challenge })
}
