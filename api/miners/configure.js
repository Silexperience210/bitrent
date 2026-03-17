/**
 * Configure Bitaxe Miner via Real HTTP API
 * Sets pool, stratum address, and worker name
 * Uses actual Bitaxe /api/system PATCH endpoint
 */

import { supabase } from '../_lib/supabase.js'
import { verify, fromHeader } from '../_lib/jwt.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify JWT
    const token = fromHeader(req.headers.authorization)
    const payload = token ? verify(token) : null
    if (!payload) return res.status(401).json({ error: 'Authentication required' })

    const { miner_id, pool_url, pool_user, pool_pass, worker_name } = req.body

    if (!miner_id || !pool_url || !pool_user) {
      return res.status(400).json({
        error: 'Missing: miner_id, pool_url, pool_user'
      })
    }

    // Get miner IP from database
    const { data: miner, error: minerErr } = await supabase
      .from('mineurs')
      .select('id, ip_address, name')
      .eq('id', miner_id)
      .single()

    if (minerErr || !miner) {
      return res.status(404).json({ error: 'Miner not found' })
    }

    // Build stratum user: address.worker_name
    const stratumUser = worker_name 
      ? `${pool_user}.${worker_name}`
      : pool_user

    // Configure Bitaxe via PATCH /api/system
    const bitaxeUrl = `http://${miner.ip_address}/api/system`
    const config = {
      stratumURL: pool_url.replace(/:[0-9]+$/, ''), // Remove port if included
      stratumPort: extractPort(pool_url) || 3333,
      stratumUser: stratumUser,
      stratumPassword: pool_pass || 'x'
    }

    const configRes = await fetch(bitaxeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      timeout: 10000
    })

    if (!configRes.ok) {
      throw new Error(`Bitaxe config failed: ${configRes.statusText}`)
    }

    // Log configuration change
    await supabase.from('audit_logs').insert({
      action: 'MINER_CONFIGURED',
      resource_type: 'miner',
      resource_id: miner.id,
      changes: { pool_url, stratumUser, worker_name }
    })

    res.status(200).json({
      status: 'ok',
      miner_name: miner.name,
      miner_ip: miner.ip_address,
      pool_url: config.stratumURL,
      pool_port: config.stratumPort,
      stratum_user: stratumUser,
      worker_name: worker_name,
      message: 'Miner configured successfully'
    })
  } catch (error) {
    console.error('Configure error:', error)
    res.status(500).json({ error: error.message })
  }
}

function extractPort(poolUrl) {
  const match = poolUrl.match(/:(\d+)/)
  return match ? parseInt(match[1]) : null
}
