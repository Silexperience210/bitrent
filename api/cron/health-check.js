import { supabase } from '../_lib/supabase.js'
import { getLiveStats as getBitaxeStats } from '../_lib/bitaxe.js'
import { getLiveStats as getBraiinsStats } from '../_lib/braiins.js'

async function checkMiner(miner) {
  const ip        = miner.ip_address
  const port      = miner.port || 80
  const publicUrl = miner.metadata?.public_url || null
  const api       = miner.metadata?.api || 'bitaxe'

  try {
    if (api === 'braiins') {
      const s = await getBraiinsStats(ip, port, publicUrl)
      return { online: true, hashrate: s.hashrate, temp: s.temp, power: s.power }
    } else {
      const s = await getBitaxeStats(ip, port, publicUrl)
      return { online: true, hashrate: s.hashrate, temp: s.temp, power: s.power, uptime: s.uptime ?? null }
    }
  } catch {
    return { online: false }
  }
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: miners, error } = await supabase
    .from('mineurs')
    .select('id, name, ip_address, port, status, uptime_percentage')
    .neq('status', 'maintenance')

  if (error || !miners?.length) {
    return res.status(200).json({ ok: true, checked: 0 })
  }

  const now = new Date().toISOString()
  let online = 0, offline = 0

  await Promise.all(miners.map(async (miner) => {
    const result = await checkMiner(miner)
    const newStatus = result.online ? 'online' : 'offline'

    // Smooth uptime: rolling average weighted toward current status
    const currentUptime = parseFloat(miner.uptime_percentage || 0)
    const uptimeUpdate = result.online
      ? Math.min(100, currentUptime * 0.95 + 5)
      : Math.max(0, currentUptime * 0.95)

    await supabase
      .from('mineurs')
      .update({
        status: newStatus,
        uptime_percentage: uptimeUpdate.toFixed(2),
        last_checked: now,
        updated_at: now,
        metadata: {
          ...(miner.metadata || {}),
          last_hashrate: result.hashrate ?? null,
          last_temp: result.temp ?? null,
          last_power: result.power ?? null,
          last_uptime_seconds: result.uptime ?? null,
        },
      })
      .eq('id', miner.id)

    result.online ? online++ : offline++
  }))

  console.log(`[cron/health-check] online=${online} offline=${offline}`)
  return res.status(200).json({ ok: true, checked: miners.length, online, offline })
}
