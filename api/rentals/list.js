import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Authentication required' })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('pubkey_nostr', payload.pubkey)
    .single()

  if (!user) return res.status(404).json({ error: 'User not found' })

  const { data: rentals, error } = await supabase
    .from('rentals')
    .select(`
      id, status, start_time, end_time, duration_minutes,
      total_sats, created_at, metadata,
      mineur:mineurs ( id, name, hashrate_specs )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[rentals/list] DB error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch rentals' })
  }

  const now = Date.now()
  return res.status(200).json({
    rentals: (rentals || []).map(r => ({
      id: r.id,
      status: r.status,
      miner_name: r.mineur?.name || 'Unknown',
      hashrate_ths: parseFloat(r.mineur?.hashrate_specs || 0),
      start_time: r.start_time,
      end_time: r.end_time,
      duration_minutes: r.duration_minutes,
      remaining_minutes: Math.max(0, Math.floor((new Date(r.end_time).getTime() - now) / 60000)),
      total_sats: r.total_sats,
      pool_name: r.metadata?.pool_name || null,
      created_at: r.created_at,
    })),
  })
}
