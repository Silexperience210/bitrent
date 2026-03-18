/**
 * bitaxe.js — Bitaxe/AxeOS HTTP API helpers
 *
 * NOTE: The backend must be able to reach the miner's IP address.
 * If the miner is on a local network (192.168.x.x), you must either:
 *   - Port-forward the miner's port 80 on your router, or
 *   - Self-host the backend on the same network as the miners.
 */

const TIMEOUT_MS = 8000

function signal() {
  return AbortSignal.timeout(TIMEOUT_MS)
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
export async function getPoolConfig(ip, port = 80) {
  const res = await fetch(`http://${ip}:${port}/api/system/info`, { signal: signal() })
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
 * Configure the Bitaxe to mine toward a specific pool + payout address.
 * Sends PATCH /api/system then POST /api/system/restart.
 *
 * @param {string} ip           - Miner IP (must be reachable from the backend)
 * @param {number} port         - Miner HTTP port (default 80)
 * @param {string} poolUrl      - Full stratum URL, e.g. "stratum+tcp://mine.ocean.xyz:3333"
 * @param {string} stratumUser  - Worker name, e.g. "bc1q...address.bitrent"
 * @param {string} [stratumPassword] - Stratum password (default "x")
 */
export async function setPool(ip, port = 80, poolUrl, stratumUser, stratumPassword = 'x') {
  const { host, port: stratumPort } = parseStratumUrl(poolUrl)

  const res = await fetch(`http://${ip}:${port}/api/system`, {
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
export async function restartMiner(ip, port = 80) {
  const res = await fetch(`http://${ip}:${port}/api/system/restart`, {
    method: 'POST',
    signal: signal(),
  })
  if (!res.ok) throw new Error(`Bitaxe POST /api/system/restart returned ${res.status}`)
}
