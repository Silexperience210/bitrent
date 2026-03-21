import { supabase } from '../_lib/supabase.js'
import { setCors } from '../_lib/cors.js'
import { verify, fromHeader } from '../_lib/jwt.js'
import { lookupInvoice } from '../_lib/nwc.js'
import * as bitaxeLib  from '../_lib/bitaxe.js'
import * as braiinsLib from '../_lib/braiins.js'

function getMinerLib(miner) {
  return (miner?.metadata?.api === 'braiins') ? braiinsLib : bitaxeLib
}

async function restorePool(miner, backup, publicUrl) {
  const ip   = miner?.ip_address
  const port = miner?.port || 80
  if (!ip || !backup) return
  if (backup.braiins) {
    await braiinsLib.restorePoolConfig(ip, port, backup, publicUrl)
    await braiinsLib.restartMiner(ip, port, publicUrl)
  } else if (backup.stratumURL) {
    const ownerPoolUrl = `stratum+tcp://${backup.stratumURL}:${backup.stratumPort}`
    await bitaxeLib.setPool(ip, port, ownerPoolUrl, backup.stratumUser, backup.stratumPassword, publicUrl)
    await bitaxeLib.restartMiner(ip, port, publicUrl)
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = fromHeader(req.headers.authorization)
  const payload = token ? verify(token) : null
  if (!payload) return res.status(401).json({ error: 'Authentication required' })

  const { id, live } = req.query
  if (!id) return res.status(400).json({ error: 'Rental id required' })

  // ?live=1 — return live Bitaxe stats only (lightweight path)
  if (live === '1') {
    const { data: r } = await supabase
      .from('rentals')
      .select('id, status, mineur:mineurs ( ip_address, port, metadata ), user:users ( pubkey_nostr )')
      .eq('id', id).single()
    if (!r) return res.status(404).json({ error: 'Rental not found' })
    if (!payload.is_admin && r.user.pubkey_nostr !== payload.pubkey)
      return res.status(403).json({ error: 'Access denied' })
    if (r.status !== 'active') return res.status(409).json({ error: 'Rental not active' })
    try {
      const lib   = getMinerLib(r.mineur)
      const stats = await lib.getLiveStats(
        r.mineur?.ip_address, r.mineur?.port || 80, r.mineur?.metadata?.public_url || null
      )
      return res.status(200).json(stats)
    } catch (err) {
      return res.status(502).json({ error: 'Could not reach miner', detail: err.message })
    }
  }

  // Fetch rental with miner info (include ip_address for Bitaxe API calls)
  const { data: rental, error } = await supabase
    .from('rentals')
    .select(`
      id, status, start_time, end_time, duration_minutes,
      sats_per_minute, total_sats, invoice_hash, metadata,
      mineur:mineurs ( id, name, hashrate_specs, status, ip_address, port, metadata ),
      user:users ( id, pubkey_nostr )
    `)
    .eq('id', id)
    .single()

  if (error || !rental) return res.status(404).json({ error: 'Rental not found' })

  // Users can only see their own rentals (admins can see all)
  if (!payload.is_admin && rental.user.pubkey_nostr !== payload.pubkey) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // If active but activation failed, retry activation
  if (rental.status === 'active' && rental.metadata?.activation_ok === false) {
    const ip  = rental.mineur?.ip_address
    const port = rental.mineur?.port || 80
    const publicUrl = rental.mineur?.metadata?.public_url || null
    if (ip) {
      try {
        const lib = getMinerLib(rental.mineur)
        const ownerConfigBackup = await lib.getPoolConfig(ip, port, publicUrl)
        const stratumUser = `${rental.metadata.payout_address}.${rental.metadata.worker_name || 'bitrent'}`
        await lib.setPool(ip, port, rental.metadata.pool_url, stratumUser, 'x', publicUrl)
        await lib.restartMiner(ip, port, publicUrl)
        const now = new Date().toISOString()
        await supabase.from('rentals').update({
          updated_at: now,
          metadata: { ...rental.metadata, activation_ok: true, owner_config_backup: ownerConfigBackup },
        }).eq('id', rental.id)
        rental.metadata = { ...rental.metadata, activation_ok: true, owner_config_backup: ownerConfigBackup }
        console.log(`[rentals/status] Retry activation OK for rental ${rental.id}`)
      } catch (retryErr) {
        console.error(`[rentals/status] Retry activation failed for rental ${rental.id}:`, retryErr.message)
      }
    }
  }

  // If still pending, check payment via NWC
  if (rental.status === 'pending' && rental.invoice_hash) {
    try {
      const { paid, settled_at } = await lookupInvoice(rental.invoice_hash)
      if (paid) {
        const now = new Date().toISOString()

        // ── Activate the physical Bitaxe miner ───────────────────────────────
        const ip   = rental.mineur?.ip_address
        const port = rental.mineur?.port || 80
        let activationOk = false
        let ownerConfigBackup = null

        if (ip) {
          try {
            const publicUrl = rental.mineur?.metadata?.public_url || null

            const lib = getMinerLib(rental.mineur)
            // 1. Save owner's current pool config so we can restore it after expiry
            ownerConfigBackup = await lib.getPoolConfig(ip, port, publicUrl)

            // 2. Switch miner to rental pool + client's payout address
            const stratumUser = `${rental.metadata.payout_address}.${rental.metadata.worker_name || 'bitrent'}`
            await lib.setPool(ip, port, rental.metadata.pool_url, stratumUser, 'x', publicUrl)

            // 3. Restart miner to apply new config (~30s downtime, expected)
            await lib.restartMiner(ip, port, publicUrl)

            activationOk = true
            console.log(`[rentals/status] Miner ${ip} activated for rental ${rental.id}`)
          } catch (bitaxeErr) {
            // Payment received but miner activation failed — log for admin investigation
            console.error(`[rentals/status] Miner activation failed for rental ${rental.id}:`, bitaxeErr.message)
          }
        } else {
          console.warn(`[rentals/status] Rental ${rental.id}: miner has no IP — skipping activation`)
        }
        // ─────────────────────────────────────────────────────────────────────

        // Update rental: active + save owner config backup in metadata
        await supabase
          .from('rentals')
          .update({
            status: 'active',
            payment_verified_at: now,
            updated_at: now,
            metadata: {
              ...rental.metadata,
              activation_ok: activationOk,
              owner_config_backup: ownerConfigBackup,
            },
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
          changes: { invoice_hash: rental.invoice_hash, settled_at, activation_ok: activationOk },
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

  // Auto-expire active rentals whose end_time has passed
  if (rental.status === 'active' && endTime < now) {
    const nowIso = new Date().toISOString()
    const ip   = rental.mineur?.ip_address
    const port = rental.mineur?.port || 80
    const publicUrl = rental.mineur?.metadata?.public_url || null
    const backup = rental.metadata?.owner_config_backup

    await supabase.from('rentals').update({ status: 'completed', updated_at: nowIso }).eq('id', rental.id)
    rental.status = 'completed'

    if (ip && backup) {
      try {
        await restorePool(rental.mineur, backup, publicUrl)
        console.log(`[rentals/status] Miner ${ip} restored after rental ${rental.id} expired`)
      } catch (err) {
        console.error(`[rentals/status] Failed to restore miner after expiry:`, err.message)
      }
    }
  }

  return res.status(200).json({
    id: rental.id,
    status: rental.status,
    miner: {
      id: rental.mineur?.id,
      name: rental.mineur?.name,
      hashrate_ths: parseFloat(rental.mineur?.hashrate_specs || 0),
      last_hashrate: rental.mineur?.metadata?.last_hashrate ?? null,
      last_temp: rental.mineur?.metadata?.last_temp ?? null,
      last_power: rental.mineur?.metadata?.last_power ?? null,
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
