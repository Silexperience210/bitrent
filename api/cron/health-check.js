import { supabase } from '../_lib/supabase.js'

const BITAXE_API_TIMEOUT_MS = 5000

async function checkMiner(miner) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), BITAXE_API_TIMEOUT_MS)

    const res = await fetch(`http://${miner.ip_address}:${miner.port || 80}/api/system/info`, {
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return { online: false }

    const data = await res.json()
    return {
      online: true,
      hashrate: data.hashRate,
      temp: data.temp,
      power: data.power,
      uptime: data.uptimeSeconds,
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
        metadata: supabase.rpc ? miner.metadata : {
          ...miner.metadata,
          last_hashrate: result.hashrate || null,
          last_temp: result.temp || null,
          last_power: result.power || null,
        },
      })
      .eq('id', miner.id)

    result.online ? online++ : offline++
  }))

  console.log(`[cron/health-check] online=${online} offline=${offline}`)
  return res.status(200).json({ ok: true, checked: miners.length, online, offline })
}
