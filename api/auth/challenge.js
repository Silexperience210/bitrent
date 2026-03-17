import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { isValidPubkey } from '../_lib/nostr.js'
import crypto from 'crypto'

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pubkey } = req.body || {}
  if (!isValidPubkey(pubkey)) {
    return res.status(400).json({ error: 'Invalid pubkey: must be 64 lowercase hex chars' })
  }

  // Rate limit: max 5 per pubkey per 5 minutes
  const { count } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('pubkey_nostr', pubkey)
    .gt('created_at', new Date(Date.now() - CHALLENGE_TTL_MS).toISOString())

  if (count >= 5) {
    return res.status(429).json({ error: 'Too many requests. Try again in 5 minutes.' })
  }

  // Remove any stale challenges for this pubkey
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
  })

  if (error) {
    console.error('[challenge] DB error:', error.message)
    return res.status(500).json({ error: 'Failed to create challenge' })
  }

  return res.status(200).json({ challenge })
}
