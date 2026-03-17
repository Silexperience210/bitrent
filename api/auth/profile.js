import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Invalid or missing token' })

  const { data: user, error } = await supabase
    .from('users')
    .select('id, pubkey_nostr, role, created_at, metadata')
    .eq('pubkey_nostr', payload.pubkey)
    .single()

  if (error || !user) return res.status(404).json({ error: 'User not found' })

  // Active and past rentals count
  const { count: activeCount } = await supabase
    .from('rentals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { count: totalCount } = await supabase
    .from('rentals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return res.status(200).json({
    user: {
      id: user.id,
      pubkey: user.pubkey_nostr,
      role: user.role,
      is_admin: user.role === 'admin',
      created_at: user.created_at,
      stats: {
        active_rentals: activeCount || 0,
        total_rentals: totalCount || 0,
      },
    },
  })
}
