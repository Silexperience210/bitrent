/**
 * Register a Bitaxe Miner
 * Discovers miner on network and adds to database
 */

import { supabase } from '../_lib/supabase.js'
import { verify, fromHeader } from '../_lib/jwt.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify JWT - admin only
    const token = fromHeader(req.headers.authorization)
    const payload = token ? verify(token) : null
    if (!payload) return res.status(401).json({ error: 'Authentication required' })

    const { ip_address, name, sats_per_minute } = req.body

    if (!ip_address || !name || !sats_per_minute) {
      return res.status(400).json({
        error: 'Missing: ip_address, name, sats_per_minute'
      })
    }

    // Test connection to Bitaxe
    const infoUrl = `http://${ip_address}/api/system/info`
    const infoRes = await fetch(infoUrl, { timeout: 5000 })
    
    if (!infoRes.ok) {
      return res.status(400).json({
        error: `Cannot reach Bitaxe at ${ip_address}: ${infoRes.statusText}`
      })
    }

    const info = await infoRes.json()

    // Register miner in database
    const { data: miner, error: minerErr } = await supabase
      .from('mineurs')
      .insert({
        name: name,
        ip_address: ip_address,
        port: 80,
        hashrate_specs: Math.round(info.hashRate / 1000) || 10, // Convert to TH/s
        sats_per_minute: sats_per_minute,
        status: 'online',
        metadata: {
          model: info.deviceModel || 'Bitaxe',
          asic_model: info.ASICModel,
          firmware_version: info.version,
          mac_address: info.macAddr,
          hostname: info.hostname,
          registered_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (minerErr) {
      throw new Error(`Database error: ${minerErr.message}`)
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      action: 'MINER_REGISTERED',
      resource_type: 'miner',
      resource_id: miner.id,
      changes: { ip_address, name, hashrate: info.hashRate }
    })

    res.status(201).json({
      status: 'ok',
      miner: {
        id: miner.id,
        name: miner.name,
        ip_address: miner.ip_address,
        hashrate: `${info.hashRate.toFixed(2)} TH/s`,
        power: `${info.power.toFixed(2)} W`,
        temperature: `${info.temp}°C`,
        sats_per_minute: sats_per_minute,
        current_pool: info.stratumURL,
        shares_accepted: info.sharesAccepted
      },
      message: 'Miner registered successfully'
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message })
  }
}
