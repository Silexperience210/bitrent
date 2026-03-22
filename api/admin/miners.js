import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'

function requireAdmin(req, res) {
  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) { res.status(401).json({ error: 'Authentication required' }); return null }
  if (!payload.is_admin) { res.status(403).json({ error: 'Admin access required' }); return null }
  return payload
}

export default async function handler(req, res) {
  if (setCors(req, res)) return
  const payload = requireAdmin(req, res)
  if (!payload) return

  // GET — list all miners
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('mineurs')
      .select(`
        id, name, ip_address, port, hashrate_specs, sats_per_minute,
        status, total_revenue_sats, uptime_percentage, last_checked, metadata, created_at
      `)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    // Active rental count per miner
    const ids = (data || []).map(m => m.id)
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('mineur_id, end_time')
      .in('mineur_id', ids)
      .eq('status', 'active')

    const activeRentalMap = new Map((activeRentals || []).map(r => [r.mineur_id, r.end_time]))

    return res.status(200).json({
      miners: (data || []).map(m => ({
        ...m,
        currently_rented: activeRentalMap.has(m.id),
        rental_end_time: activeRentalMap.get(m.id) || null,
      })),
    })
  }

  // POST — create miner
  if (req.method === 'POST') {
    const { name, ip_address, port = 80, hashrate_specs, sats_per_minute, metadata } = req.body || {}

    if (!name || !ip_address || !hashrate_specs || !sats_per_minute) {
      return res.status(400).json({ error: 'Required: name, ip_address, hashrate_specs, sats_per_minute' })
    }
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip_address)) {
      return res.status(400).json({ error: 'Invalid IP address format' })
    }

    // Get admin user id
    const { data: adminUser, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('pubkey_nostr', payload.pubkey)
      .single()

    if (userErr || !adminUser) {
      return res.status(500).json({ error: 'Admin user record not found' })
    }

    const { data, error } = await supabase
      .from('mineurs')
      .insert({
        owner_id: adminUser.id,
        name,
        ip_address,
        port,
        hashrate_specs,
        sats_per_minute,
        status: 'offline',
        metadata: metadata || {},
      })
      .select('id, name, ip_address, status')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ miner: data })
  }

  // DELETE — remove miner (only if no active rentals)
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Miner id required' })

    const { count } = await supabase
      .from('rentals')
      .select('id', { count: 'exact', head: true })
      .eq('mineur_id', id)
      .eq('status', 'active')

    if (count > 0) return res.status(409).json({ error: 'Cannot delete miner with active rentals' })

    const { error } = await supabase.from('mineurs').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ message: 'Miner deleted' })
  }

  // PATCH — update miner status or config
  if (req.method === 'PATCH') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Miner id required' })

    const allowed = ['status', 'sats_per_minute', 'name', 'metadata']
    const updates = {}
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('mineurs')
      .update(updates)
      .eq('id', id)
      .select('id, name, status, sats_per_minute')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ miner: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
