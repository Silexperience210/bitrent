import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'
import { getLiveStats } from '../_lib/bitaxe.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Authentication required' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Rental id required' })

  const { data: rental } = await supabase
    .from('rentals')
    .select('id, status, mineur:mineurs ( ip_address, port, metadata ), user:users ( pubkey_nostr )')
    .eq('id', id)
    .single()

  if (!rental) return res.status(404).json({ error: 'Rental not found' })
  if (!payload.is_admin && rental.user.pubkey_nostr !== payload.pubkey) {
    return res.status(403).json({ error: 'Access denied' })
  }
  if (rental.status !== 'active') {
    return res.status(409).json({ error: 'Rental not active' })
  }

  const ip        = rental.mineur?.ip_address
  const port      = rental.mineur?.port || 80
  const publicUrl = rental.mineur?.metadata?.public_url || null

  try {
    const stats = await getLiveStats(ip, port, publicUrl)
    return res.status(200).json(stats)
  } catch (err) {
    console.error('[rentals/live] Bitaxe fetch failed:', err.message)
    return res.status(502).json({ error: 'Could not reach miner', detail: err.message })
  }
}
