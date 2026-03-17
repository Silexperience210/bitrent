import { supabase } from '../_lib/supabase.js'

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
  const results = { expired_rentals: 0, cancelled_rentals: 0 }

  // 1. Complete active rentals past their end_time
  const { data: expiredActive, error: e1 } = await supabase
    .from('rentals')
    .update({ status: 'completed', updated_at: now })
    .eq('status', 'active')
    .lt('end_time', now)
    .select('id')

  if (!e1) results.expired_rentals = expiredActive?.length || 0

  // 2. Cancel pending rentals whose invoice has expired
  const { data: expiredPending, error: e2 } = await supabase
    .from('rentals')
    .update({ status: 'cancelled', updated_at: now })
    .eq('status', 'pending')
    .lt('end_time', now)  // end_time was set at rental creation + duration
    .select('id')

  if (!e2) results.cancelled_rentals = expiredPending?.length || 0

  // 3. Mark expired payment records
  await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', now)

  console.log('[cron/expire-rentals]', results)
  return res.status(200).json({ ok: true, ...results })
}
