import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { status = 'online' } = req.query

  let query = supabase
    .from('mineurs')
    .select('id, name, hashrate_specs, sats_per_minute, status, uptime_percentage, last_checked, metadata')
    .order('sats_per_minute', { ascending: true })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[miners] DB error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch miners' })
  }

  // For each online miner, check if it has an active rental (unavailable)
  const minerIds = (data || []).map(m => m.id)
  let activeRentalMinerIds = new Set()

  let activeRentalMap = new Map()

  if (minerIds.length > 0) {
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('mineur_id, end_time')
      .in('mineur_id', minerIds)
      .eq('status', 'active')

    activeRentalMap = new Map((activeRentals || []).map(r => [r.mineur_id, r.end_time]))
  }

  const miners = (data || []).map(m => ({
    id: m.id,
    name: m.name,
    hashrate_ths: parseFloat(m.hashrate_specs),
    sats_per_minute: m.sats_per_minute,
    sats_per_hour: m.sats_per_minute * 60,
    status: m.status,
    available: m.status === 'online' && !activeRentalMap.has(m.id),
    rental_end_time: activeRentalMap.get(m.id) || null,
    uptime_percentage: parseFloat(m.uptime_percentage || 0).toFixed(1),
    last_checked: m.last_checked,
    model: m.metadata?.model || 'Bitaxe',
    chips: m.metadata?.chips || null,
  }))

  return res.status(200).json({ miners })
}
