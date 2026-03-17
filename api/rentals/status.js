import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'
import { lookupInvoice } from '../_lib/nwc.js'

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Authentication required' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Rental id required' })

  // Fetch rental with miner info
  const { data: rental, error } = await supabase
    .from('rentals')
    .select(`
      id, status, start_time, end_time, duration_minutes,
      sats_per_minute, total_sats, invoice_hash, metadata,
      mineur:mineurs ( id, name, hashrate_specs, status ),
      user:users ( id, pubkey_nostr )
    `)
    .eq('id', id)
    .single()

  if (error || !rental) return res.status(404).json({ error: 'Rental not found' })

  // Users can only see their own rentals (admins can see all)
  if (!payload.is_admin && rental.user.pubkey_nostr !== payload.pubkey) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // If still pending, check payment via NWC
  if (rental.status === 'pending' && rental.invoice_hash) {
    try {
      const { paid, settled_at } = await lookupInvoice(rental.invoice_hash)
      if (paid) {
        // Activate rental
        const now = new Date().toISOString()
        await supabase
          .from('rentals')
          .update({
            status: 'active',
            payment_verified_at: now,
            updated_at: now,
          })
          .eq('id', rental.id)

        await supabase
          .from('payments')
          .update({ status: 'confirmed', confirmed_at: now })
          .eq('invoice_hash', rental.invoice_hash)

        await supabase.from('audit_logs').insert({
          user_id: rental.user.id,
          action: 'PAYMENT_CONFIRMED',
          resource_type: 'rental',
          resource_id: rental.id,
          changes: { invoice_hash: rental.invoice_hash, settled_at },
        })

        rental.status = 'active'
        rental.payment_verified_at = now
      }
    } catch (nwcErr) {
      // NWC lookup failed — don't fail the request, just return current status
      console.error('[rentals/status] NWC lookup error:', nwcErr.message)
    }
  }

  const now = Date.now()
  const endTime = new Date(rental.end_time).getTime()
  const startTime = new Date(rental.start_time).getTime()
  const remainingMs = Math.max(0, endTime - now)
  const elapsedMs = Math.max(0, now - startTime)

  return res.status(200).json({
    id: rental.id,
    status: rental.status,
    miner: {
      id: rental.mineur?.id,
      name: rental.mineur?.name,
      hashrate_ths: parseFloat(rental.mineur?.hashrate_specs || 0),
    },
    start_time: rental.start_time,
    end_time: rental.end_time,
    duration_minutes: rental.duration_minutes,
    elapsed_minutes: Math.floor(elapsedMs / 60000),
    remaining_minutes: Math.floor(remainingMs / 60000),
    total_sats: rental.total_sats,
    payment_verified_at: rental.payment_verified_at || null,
    // Mining config revealed only when active
    mining_config: rental.status === 'active' ? {
      pool_name: rental.metadata?.pool_name,
      pool_url: rental.metadata?.pool_url,
      payout_address: rental.metadata?.payout_address,
      stratum_user: `${rental.metadata?.payout_address}.bitrent`,
      stratum_password: 'x',
    } : null,
  })
}
