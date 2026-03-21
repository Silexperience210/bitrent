/**
 * start-miners.js — BitRent tunnel manager
 * - Starts hex-proxy (strips CF headers for Hex Bitaxe)
 * - Starts cloudflared tunnels for Octaxe + Hex
 * - Detects tunnel URLs and updates Supabase automatically
 * - Sends alerts if miners become unreachable
 *
 * Usage: node start-miners.js
 * Auto-start: installed via Task Scheduler (run setup-autostart.ps1)
 */

const { spawn, execSync } = require('child_process')
const path      = require('path')
const fs        = require('fs')

// ── Config ────────────────────────────────────────────────────────────────────
const DIR             = __dirname
const CLOUDFLARED     = path.join(DIR, 'cloudflared.exe')
const HEX_PROXY       = path.join(DIR, 'hex-proxy.cjs')
const LOG_FILE        = path.join(DIR, 'tunnel.log')

const OCTAXE_IP       = '192.168.1.166'
const HEX_PROXY_PORT  = 8142
const BRAIINS_IP      = '192.168.1.83'
const CHECK_INTERVAL  = 5 * 60 * 1000  // 5 min health check

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = path.join(DIR, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?\s*$/)
    if (m) process.env[m[1]] = m[2].replace(/\\n$/, '').trim()
  }
}

const SUPABASE_URL    = process.env.SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY

// ── Kill existing cloudflared + proxy on startup ──────────────────────────────
try {
  execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' })
} catch {}
try {
  // Kill node processes on port 8142
  execSync(`for /f "tokens=5" %a in ('netstat -ano ^| find ":${HEX_PROXY_PORT}"') do taskkill /F /PID %a`, { shell: 'cmd', stdio: 'ignore' })
} catch {}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

// ── Extract trycloudflare URL from cloudflared output ─────────────────────────
function extractUrl(data) {
  const m = data.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  return m ? m[0] : null
}

// ── Update miner public_url in Supabase ───────────────────────────────────────
async function updateSupabase(minerName, publicUrl) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log(`[warn] SUPABASE env vars missing — skipping DB update for ${minerName}`)
    return
  }

  // Fetch current metadata first
  const current = await fetch(
    `${SUPABASE_URL}/rest/v1/mineurs?name=eq.${encodeURIComponent(minerName)}&select=metadata`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  ).then(r => r.json())

  const meta = current?.[0]?.metadata || {}

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mineurs?name=eq.${encodeURIComponent(minerName)}`,
    {
      method:  'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ metadata: { ...meta, public_url: publicUrl } }),
    }
  )
  if (res.ok) log(`[db] ${minerName} → ${publicUrl}`)
  else log(`[error] DB update failed for ${minerName}: ${res.status}`)
}

// ── Health check ──────────────────────────────────────────────────────────────
async function checkMiner(name, url, api = 'bitaxe') {
  try {
    if (api === 'braiins') {
      const res = await fetch(`${url}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ bosminer { info { summary { realHashrate { mhs1M } temperatureChip { degreesC } } } } }' }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      const s = d.data?.bosminer?.info?.summary
      const ths = ((s?.realHashrate?.mhs1M || 0) / 1e6).toFixed(2)
      const temp = s?.temperatureChip?.degreesC ?? '?'
      log(`[health] ${name} OK — ${ths} TH/s ${temp}°C`)
    } else {
      const res = await fetch(`${url}/api/system/info`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      log(`[health] ${name} OK — ${(d.hashRate / 1000).toFixed(2)} TH/s ${d.temp}°C`)
    }
  } catch (err) {
    log(`[alert] ⚠ ${name} UNREACHABLE: ${err.message}`)
  }
}

// ── Auto-expire rentals whose end_time has passed ────────────────────────────
async function checkExpiredRentals() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rentals?status=eq.active&select=id,end_time,metadata,mineur:mineurs(id,ip_address,port,metadata)`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) return
    const rentals = await res.json()
    const now = Date.now()
    for (const r of rentals) {
      if (!r.end_time || new Date(r.end_time).getTime() > now) continue
      log(`[expire] Rental ${r.id.slice(0, 8)} expired — restoring miner`)
      // Mark completed first
      await fetch(`${SUPABASE_URL}/rest/v1/rentals?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() }),
      })
      // Restore pool config
      const ip      = r.mineur?.ip_address
      const port    = r.mineur?.port || 80
      const backup  = r.metadata?.owner_config_backup
      const pubUrl  = r.mineur?.metadata?.public_url
      if (!ip || !backup) {
        log(`[expire] No backup for rental ${r.id.slice(0, 8)} — skip restore`)
        continue
      }
      const base = pubUrl || `http://${ip}:${port}`
      try {
        if (backup.braiins) {
          // 1. Get current pool IDs (rental pool)
          const infoRes = await fetch(`${base}/graphql`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ bosminer { config { ... on BosminerConfig { groups { id pools { id } } } } } }' }),
            signal: AbortSignal.timeout(10000),
          })
          const infoJson = await infoRes.json()
          const group    = infoJson.data?.bosminer?.config?.groups?.[0]
          const groupId  = group?.id || '0'
          const rentalPools = group?.pools || []
          // 2. Add owner pools back first
          for (const pool of [...(backup.pools || [])].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0))) {
            const u = (pool.url  || '').replace(/"/g, '\\"')
            const s = (pool.user || '').replace(/"/g, '\\"')
            const p = (pool.password || 'x').replace(/"/g, '\\"')
            await fetch(`${base}/graphql`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: `mutation { bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") { ... on GroupConfigurator { addPool(enabled: ${pool.enabled ? 'true' : 'false'}, url: "${u}", user: "${s}", password: "${p}") { __typename } } } } } } }` }),
              signal: AbortSignal.timeout(10000),
            })
          }
          // 3. Remove rental pools
          for (const pool of rentalPools) {
            await fetch(`${base}/graphql`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: `mutation { bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") { ... on GroupConfigurator { removePool(id: ${pool.id}) { __typename } } } } } } }` }),
              signal: AbortSignal.timeout(10000),
            })
          }
        } else if (backup.stratumURL) {
          await fetch(`${base}/api/system`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stratumURL: backup.stratumURL,
              stratumPort: backup.stratumPort,
              stratumUser: backup.stratumUser,
              stratumPassword: backup.stratumPassword,
            }),
            signal: AbortSignal.timeout(10000),
          })
          await fetch(`${base}/api/system/restart`, { method: 'POST', signal: AbortSignal.timeout(10000) })
        }
        log(`[expire] Miner ${ip} restored OK`)
      } catch (err) {
        log(`[expire] Restore failed for ${ip}: ${err.message}`)
      }
    }
  } catch (err) {
    log(`[expire] checkExpiredRentals error: ${err.message}`)
  }
}

// ── Start a cloudflared tunnel ────────────────────────────────────────────────
function startTunnel(name, targetUrl, onUrl) {
  log(`[tunnel] Starting ${name} → ${targetUrl}`)
  const proc = spawn(CLOUDFLARED, [
    'tunnel', '--url', targetUrl, '--no-autoupdate'
  ], { cwd: DIR })

  let resolved = false
  const handler = (data) => {
    const text = data.toString()
    if (!resolved) {
      const url = extractUrl(text)
      if (url) {
        resolved = true
        log(`[tunnel] ${name} URL: ${url}`)
        onUrl(url)
      }
    }
  }

  proc.stdout.on('data', handler)
  proc.stderr.on('data', handler)
  proc.on('exit', (code) => {
    log(`[tunnel] ${name} exited (${code}) — restarting in 10s`)
    setTimeout(() => startTunnel(name, targetUrl, onUrl), 10000)
  })

  return proc
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log(`=== BitRent Tunnel Manager starting — ${new Date().toISOString()} ===`)

  // 1. Start Hex proxy
  log('[proxy] Starting hex-proxy on port ' + HEX_PROXY_PORT)
  const proxy = spawn(process.execPath, [HEX_PROXY], { cwd: DIR })
  proxy.stdout.on('data', d => log('[proxy] ' + d.toString().trim()))
  proxy.stderr.on('data', d => log('[proxy] ' + d.toString().trim()))
  proxy.on('exit', (code) => {
    log(`[proxy] Exited (${code}) — restarting in 5s`)
    setTimeout(() => spawn(process.execPath, [HEX_PROXY], { cwd: DIR }), 5000)
  })

  await new Promise(r => setTimeout(r, 2000)) // wait for proxy to start

  // 2. Start tunnels
  const urls = {}

  startTunnel('Octaxe', `http://${OCTAXE_IP}:80`, async (url) => {
    urls.octaxe = url
    await updateSupabase('Octaxe', url)
  })

  await new Promise(r => setTimeout(r, 3000)) // stagger tunnel starts

  startTunnel('Hex', `http://localhost:${HEX_PROXY_PORT}`, async (url) => {
    urls.hex = url
    await updateSupabase('Hex', url)
  })

  await new Promise(r => setTimeout(r, 3000)) // stagger

  startTunnel('S19 Single board', `http://${BRAIINS_IP}:80`, async (url) => {
    urls.braiins = url
    await updateSupabase('S19 Single board', url)
  })

  // 3. Periodic health checks
  setInterval(async () => {
    if (urls.octaxe) await checkMiner('Octaxe', urls.octaxe, 'bitaxe')
    if (urls.hex)    await checkMiner('Hex',    urls.hex,    'bitaxe')
    if (urls.braiins) await checkMiner('S19 Single board', urls.braiins, 'braiins')
  }, CHECK_INTERVAL)

  // 4. Auto-expire: check every 60s, run once immediately on startup
  setInterval(checkExpiredRentals, 60_000)
  await checkExpiredRentals()

  log('[ready] Tunnel manager running. Ctrl+C to stop.')
}

main().catch(err => {
  log('[fatal] ' + err.message)
  process.exit(1)
})
