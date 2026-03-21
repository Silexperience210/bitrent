/**
 * braiins.js — Braiins OS GraphQL API helpers
 *
 * Mirrors the interface of bitaxe.js so callers can swap libs transparently.
 */

const TIMEOUT_MS = 8000

function gqlUrl(ip, port = 80, publicUrl = null) {
  if (publicUrl) return `${publicUrl.replace(/\/$/, '')}/graphql`
  if (ip.startsWith('http://') || ip.startsWith('https://')) return `${ip.replace(/\/$/, '')}/graphql`
  return `http://${ip}:${port}/graphql`
}

async function gql(ip, port, publicUrl, query) {
  const url = gqlUrl(ip, port, publicUrl)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Braiins GraphQL HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

/**
 * Fetch live mining stats.
 * Returns { hashrate (MH/s), temp (°C), power (W) }
 */
export async function getLiveStats(ip, port = 80, publicUrl = null) {
  const data = await gql(ip, port, publicUrl, `{
    bosminer { info { summary {
      realHashrate { mhs1M }
      temperatureChip { degreesC }
      power { approxConsumptionW }
    } } }
  }`)
  const s = data.bosminer.info.summary
  return {
    hashrate: s.realHashrate?.mhs1M ?? 0,
    temp:     s.temperatureChip?.degreesC ?? 0,
    power:    s.power?.approxConsumptionW ?? 0,
  }
}

/**
 * Save current pool configuration so it can be restored after a rental.
 * Returns { braiins: true, pools: [{url, user, password, enabled}], stratumURL, stratumPort, stratumUser, stratumPassword }
 * stratumURL/Port/User/Password are filled from the first enabled pool for backward-compat checks.
 */
export async function getPoolConfig(ip, port = 80, publicUrl = null) {
  const data = await gql(ip, port, publicUrl, `{
    bosminer { config { ... on BosminerConfig {
      groups { id pools { id url user password enabled } }
    } } }
  }`)
  const pools = data.bosminer.config.groups?.[0]?.pools || []
  const primary = pools.find(p => p.enabled) || pools[0] || {}

  // Parse primary pool url "stratum+tcp://host:port"
  const cleaned = (primary.url || '').replace(/^stratum\+tcp:\/\//, '')
  const [host, portStr] = cleaned.split(':')

  return {
    braiins:          true,
    pools,
    stratumURL:       host || '',
    stratumPort:      parseInt(portStr) || 3333,
    stratumUser:      primary.user || '',
    stratumPassword:  primary.password || 'x',
  }
}

/**
 * Switch the miner to mine a specific pool + payout user.
 * Saves current pools and replaces them with the single new pool.
 */
export async function setPool(ip, port = 80, poolUrl, stratumUser, stratumPassword = 'x', publicUrl = null) {
  // 1. Get current pool IDs
  const data = await gql(ip, port, publicUrl, `{
    bosminer { config { ... on BosminerConfig {
      groups { id pools { id } }
    } } }
  }`)
  const currentPools = data.bosminer.config.groups?.[0]?.pools || []
  const groupId = data.bosminer.config.groups?.[0]?.id || '0'

  // 2. Add new pool first (so we never have zero pools active)
  const escapedUrl  = poolUrl.replace(/"/g, '\\"')
  const escapedUser = stratumUser.replace(/"/g, '\\"')
  const escapedPass = (stratumPassword || 'x').replace(/"/g, '\\"')
  await gql(ip, port, publicUrl, `mutation {
    bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") {
      ... on GroupConfigurator { addPool(enabled: true, url: "${escapedUrl}", user: "${escapedUser}", password: "${escapedPass}") { __typename } }
    } } } }
  `)

  // 3. Remove old pools
  for (const pool of currentPools) {
    await gql(ip, port, publicUrl, `mutation {
      bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") {
        ... on GroupConfigurator { removePool(id: ${pool.id}) { __typename } }
      } } } }
    `)
  }
}

/**
 * Restore saved pool configuration (from getPoolConfig backup).
 */
export async function restorePoolConfig(ip, port = 80, backup, publicUrl = null) {
  const data = await gql(ip, port, publicUrl, `{
    bosminer { config { ... on BosminerConfig {
      groups { id pools { id } }
    } } }
  }`)
  const currentPools = data.bosminer.config.groups?.[0]?.pools || []
  const groupId = data.bosminer.config.groups?.[0]?.id || '0'

  const savedPools = backup.pools || []

  // 1. Add original pools back (enabled ones first)
  for (const pool of [...savedPools].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0))) {
    const url  = (pool.url  || '').replace(/"/g, '\\"')
    const user = (pool.user || '').replace(/"/g, '\\"')
    const pass = (pool.password || 'x').replace(/"/g, '\\"')
    await gql(ip, port, publicUrl, `mutation {
      bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") {
        ... on GroupConfigurator { addPool(enabled: ${pool.enabled ? 'true' : 'false'}, url: "${url}", user: "${user}", password: "${pass}") { __typename } }
      } } } }
    `)
  }

  // 2. Remove rental pool(s)
  for (const pool of currentPools) {
    await gql(ip, port, publicUrl, `mutation {
      bosminer { config { ... on BosminerConfigurator { group(id: "${groupId}") {
        ... on GroupConfigurator { removePool(id: ${pool.id}) { __typename } }
      } } } }
    `)
  }
}

/**
 * Restart the miner (applies new pool config).
 */
export async function restartMiner(ip, port = 80, publicUrl = null) {
  await gql(ip, port, publicUrl, `mutation {
    bosminer { restart { ... on BosminerError { message } } }
  }`)
}
