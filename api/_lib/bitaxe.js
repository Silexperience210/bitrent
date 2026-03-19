/**
 * bitaxe.js — Bitaxe/AxeOS HTTP API helpers
 *
 * ip_address can be:
 *   - A local IP:            "192.168.1.166"         → http://192.168.1.166:80/...
 *   - A Cloudflare tunnel:   "abc.trycloudflare.com" → https://abc.trycloudflare.com/...
 *   - A full URL base:       "https://abc.example.com" → used as-is
 */

const TIMEOUT_MS = 8000

function signal() {
  return AbortSignal.timeout(TIMEOUT_MS)
}

/**
 * Build base URL. Accepts:
 *   - publicUrl override (from miner.metadata.public_url) — used first
 *   - A local IP "192.168.1.x"      → http://ip:port
 *   - A domain "abc.example.com"    → https://domain (no port)
 *   - A full URL "https://..."      → used as-is
 */
function baseUrl(ip, port = 80, publicUrl = null) {
  if (publicUrl) return publicUrl.replace(/\/$/, '')
  if (!ip) throw new Error('Miner IP/host is not set')
  if (ip.startsWith('http://') || ip.startsWith('https://')) return ip.replace(/\/$/, '')
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return `https://${ip}`
  return `http://${ip}:${port}`
}

/**
 * Parse "stratum+tcp://mine.ocean.xyz:3333" → { host, port }
 */
function parseStratumUrl(fullUrl) {
  const cleaned = (fullUrl || '').replace(/^stratum\+tcp:\/\//, '')
  const [host, portStr] = cleaned.split(':')
  return { host: host || '', port: parseInt(portStr) || 3333 }
}

/**
 * Fetch current pool config from the Bitaxe.
 * Returns { stratumURL, stratumPort, stratumUser, stratumPassword }
 */
export async function getPoolConfig(ip, port = 80, publicUrl = null) {
  const res = await fetch(`${baseUrl(ip, port, publicUrl)}/api/system/info`, { signal: signal() })
  if (!res.ok) throw new Error(`Bitaxe /api/system/info returned ${res.status}`)
  const d = await res.json()
  return {
    stratumURL:      d.stratumURL      ?? d.stratum_url      ?? '',
    stratumPort:     d.stratumPort     ?? d.stratum_port     ?? 3333,
    stratumUser:     d.stratumUser     ?? d.stratum_user     ?? '',
    stratumPassword: d.stratumPassword ?? d.stratum_password ?? 'x',
  }
}

/**
 * Fetch live mining stats from the Bitaxe.
 * Returns { hashrate, temp, bestSessionDiff, bestDiff, sharesAccepted, sharesRejected }
 */
export async function getLiveStats(ip, port = 80, publicUrl = null) {
  const res = await fetch(`${baseUrl(ip, port, publicUrl)}/api/system/info`, { signal: signal() })
  if (!res.ok) throw new Error(`Bitaxe /api/system/info returned ${res.status}`)
  const d = await res.json()
  return {
    hashrate:        d.hashRate        ?? d.hashRate_1m ?? 0,
    temp:            d.temp            ?? 0,
    bestSessionDiff: d.bestSessionDiff ?? 0,
    bestDiff:        d.bestDiff        ?? 0,
    sharesAccepted:  d.sharesAccepted  ?? 0,
    sharesRejected:  d.sharesRejected  ?? 0,
  }
}

/**
 * Configure the Bitaxe to mine toward a specific pool + payout address.
 */
export async function setPool(ip, port = 80, poolUrl, stratumUser, stratumPassword = 'x', publicUrl = null) {
  const { host, port: stratumPort } = parseStratumUrl(poolUrl)

  const res = await fetch(`${baseUrl(ip, port, publicUrl)}/api/system`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ stratumURL: host, stratumPort, stratumUser, stratumPassword }),
    signal:  signal(),
  })
  if (!res.ok) throw new Error(`Bitaxe PATCH /api/system returned ${res.status}`)
}

/**
 * Restart the Bitaxe (required to apply new pool config).
 */
export async function restartMiner(ip, port = 80, publicUrl = null) {
  const res = await fetch(`${baseUrl(ip, port, publicUrl)}/api/system/restart`, {
    method: 'POST',
    signal: signal(),
  })
  if (!res.ok) throw new Error(`Bitaxe POST /api/system/restart returned ${res.status}`)
}
