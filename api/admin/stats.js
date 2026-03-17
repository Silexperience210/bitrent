import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Authentication required' })
  if (!payload.is_admin) return res.status(403).json({ error: 'Admin access required' })

  const [
    { count: totalMiners },
    { count: onlineMiners },
    { count: activeRentals },
    { count: pendingRentals },
    { count: totalUsers },
    { data: recentRentals },
    { data: revenue },
  ] = await Promise.all([
    supabase.from('mineurs').select('id', { count: 'exact', head: true }),
    supabase.from('mineurs').select('id', { count: 'exact', head: true }).eq('status', 'online'),
    supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase
      .from('rentals')
      .select('id, total_sats, status, created_at, mineur:mineurs(name), user:users(pubkey_nostr)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('rentals')
      .select('total_sats')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const monthlyRevenue = (revenue || []).reduce((sum, r) => sum + (r.total_sats || 0), 0)

  return res.status(200).json({
    miners: { total: totalMiners || 0, online: onlineMiners || 0 },
    rentals: { active: activeRentals || 0, pending: pendingRentals || 0 },
    users: { total: totalUsers || 0 },
    revenue: { monthly_sats: monthlyRevenue },
    recent_rentals: (recentRentals || []).map(r => ({
      id: r.id,
      miner_name: r.mineur?.name,
      user_pubkey: r.user?.pubkey_nostr?.slice(0, 12) + '...',
      total_sats: r.total_sats,
      status: r.status,
      created_at: r.created_at,
    })),
  })
}
