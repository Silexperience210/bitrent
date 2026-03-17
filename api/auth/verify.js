import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verifyAuthEvent } from '../_lib/nostr.js'
import { sign } from '../_lib/jwt.js'

const ADMIN_PUBKEYS = new Set(
  (process.env.ADMIN_PUBKEYS || '').split(',').map(s => s.trim()).filter(Boolean)
)

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { event } = req.body || {}

  if (!event || typeof event !== 'object') {
    return res.status(400).json({ error: 'Missing signed Nostr event in body' })
  }

  const pubkey = event.pubkey
  if (!pubkey) return res.status(400).json({ error: 'Event missing pubkey' })

  // Fetch the challenge from DB for this pubkey (not expired)
  const { data: challengeRow, error: dbErr } = await supabase
    .from('challenges')
    .select('id, challenge')
    .eq('pubkey_nostr', pubkey)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (dbErr || !challengeRow) {
    return res.status(401).json({ error: 'Challenge not found or expired. Request a new one.' })
  }

  // Cryptographic verification (real secp256k1 via nostr-tools)
  const valid = verifyAuthEvent(event, challengeRow.challenge)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid Nostr signature' })
  }

  // Challenge is consumed — delete it
  await supabase.from('challenges').delete().eq('id', challengeRow.id)

  // Upsert user in DB
  const isAdmin = ADMIN_PUBKEYS.has(pubkey)
  const { data: user, error: upsertErr } = await supabase
    .from('users')
    .upsert(
      { pubkey_nostr: pubkey, role: isAdmin ? 'admin' : 'user', updated_at: new Date().toISOString() },
      { onConflict: 'pubkey_nostr' }
    )
    .select('id, pubkey_nostr, role, created_at')
    .single()

  if (upsertErr) {
    console.error('[verify] DB upsert error:', upsertErr.message)
    return res.status(500).json({ error: 'Failed to create user session' })
  }

  const token = sign({ pubkey, is_admin: isAdmin, user_id: user.id })

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'LOGIN',
    resource_type: 'user',
    resource_id: user.id,
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
  })

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      pubkey: user.pubkey_nostr,
      role: user.role,
      is_admin: isAdmin,
    },
  })
}
