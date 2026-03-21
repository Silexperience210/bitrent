import { supabase } from '../_lib/supabase.js'
import * as bitaxeLib  from '../_lib/bitaxe.js'
import * as braiinsLib from '../_lib/braiins.js'

export default async function handler(req, res) {
  // Protect cron endpoint
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const now = new Date().toISOString()
  const results = { expired_rentals: 0, cancelled_rentals: 0, restored_miners: 0 }

  // 1. Find active rentals past their end_time (with miner info for restoration)
  const { data: expiredActive } = await supabase
    .from('rentals')
    .select('id, metadata, mineur:mineurs ( ip_address, port, metadata )')
    .eq('status', 'active')
    .lt('end_time', now)

  if (expiredActive?.length) {
    // Mark all as completed
    const ids = expiredActive.map(r => r.id)
    await supabase
      .from('rentals')
      .update({ status: 'completed', updated_at: now })
      .in('id', ids)

    results.expired_rentals = ids.length

    // Restore each miner to owner's original pool config
    for (const rental of expiredActive) {
      const ip   = rental.mineur?.ip_address
      const port = rental.mineur?.port || 80
      const backup = rental.metadata?.owner_config_backup

      if (!ip || !backup) {
        console.warn(`[expire-rentals] Rental ${rental.id}: no IP or no backup config — skipping restore`)
        continue
      }

      try {
        const publicUrl = rental.mineur?.metadata?.public_url || null
        if (backup.braiins) {
          await braiinsLib.restorePoolConfig(ip, port, backup, publicUrl)
          await braiinsLib.restartMiner(ip, port, publicUrl)
        } else if (backup.stratumURL) {
          const ownerPoolUrl = `stratum+tcp://${backup.stratumURL}:${backup.stratumPort}`
          await bitaxeLib.setPool(ip, port, ownerPoolUrl, backup.stratumUser, backup.stratumPassword, publicUrl)
          await bitaxeLib.restartMiner(ip, port, publicUrl)
        }
        results.restored_miners++
        console.log(`[expire-rentals] Miner ${ip} restored to owner config after rental ${rental.id}`)
      } catch (err) {
        console.error(`[expire-rentals] Failed to restore miner ${ip} for rental ${rental.id}:`, err.message)
      }
    }
  }

  // 2. Cancel pending rentals whose invoice has expired
  const { data: expiredPending } = await supabase
    .from('rentals')
    .update({ status: 'cancelled', updated_at: now })
    .eq('status', 'pending')
    .lt('end_time', now)
    .select('id')

  if (!expiredPending?.error) results.cancelled_rentals = expiredPending?.length || 0

  // 3. Mark expired payment records
  await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', now)

  console.log('[cron/expire-rentals]', results)
  return res.status(200).json({ ok: true, ...results })
}
