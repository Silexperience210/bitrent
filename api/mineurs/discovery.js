/**
 * Miner Auto-Discovery & Health Monitoring
 * Scans network for Bitaxe miners and updates status
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BITAXE_API_PORT = 80;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const HASHRATE_THRESHOLD = 0.1; // TH/s minimum to consider active

/**
 * Health check for a single miner
 */
async function checkMinerHealth(ipAddress) {
  try {
    const url = `http://${ipAddress}:${BITAXE_API_PORT}/api/status`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      timeout: HEALTH_CHECK_TIMEOUT
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        online: false,
        hashrate: 0,
        uptime: 0,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();

    return {
      online: true,
      hashrate: data.hashrate || 0,
      uptime: data.uptime || 0,
      temperature: data.temperature || null,
      power: data.power || null,
      firmware: data.firmware || 'unknown'
    };
  } catch (error) {
    return {
      online: false,
      hashrate: 0,
      uptime: 0,
      error: error.message
    };
  }
}

/**
 * Update miner status in database
 */
async function updateMinerStatus(minerId, healthData) {
  const newStatus = healthData.online ? 'online' : 'offline';
  const uptime = healthData.uptime || 0;

  const { error } = await supabase
    .from('mineurs')
    .update({
      status: newStatus,
      uptime_percentage: Math.min(uptime, 100),
      last_checked: new Date().toISOString(),
      metadata: {
        hashrate_live: healthData.hashrate,
        temperature: healthData.temperature,
        power: healthData.power,
        firmware: healthData.firmware
      }
    })
    .eq('id', minerId);

  if (error) {
    console.error(`Failed to update miner ${minerId}:`, error);
  }

  return !error;
}

/**
 * Discover miners on network (scans IP range)
 * Format: 192.168.1.100-110
 */
async function discoverMinersInRange(ipRange) {
  const [baseIP, portRange] = ipRange.split('-');
  if (!baseIP || !portRange) {
    throw new Error('Invalid IP range format: use 192.168.1.100-110');
  }

  const [octet1, octet2, octet3] = baseIP.split('.').slice(0, 3);
  const [startPort, endPort] = portRange.split('-');
  
  const discovered = [];
  const promises = [];

  // Scan all IPs in range
  for (let i = parseInt(startPort); i <= parseInt(endPort); i++) {
    const ip = `${octet1}.${octet2}.${octet3}.${i}`;
    
    promises.push(
      (async () => {
        const health = await checkMinerHealth(ip);
        if (health.online) {
          discovered.push({
            ip_address: ip,
            hashrate: health.hashrate,
            status: 'online'
          });
        }
      })()
    );
  }

  await Promise.all(promises);
  return discovered;
}

/**
 * Main handler: scan all miners and update status
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ipRange } = req.body;

    // Action: health-check (scan existing miners)
    if (action === 'health-check') {
      const { data: miners, error } = await supabase
        .from('mineurs')
        .select('id, ip_address, name');

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch miners' });
      }

      const results = [];
      const promises = miners.map(async (miner) => {
        const health = await checkMinerHealth(miner.ip_address);
        const updated = await updateMinerStatus(miner.id, health);
        
        results.push({
          name: miner.name,
          ip: miner.ip_address,
          status: health.online ? 'online' : 'offline',
          hashrate: health.hashrate,
          uptime: health.uptime
        });
      });

      await Promise.all(promises);

      return res.status(200).json({
        status: 'ok',
        checked: results.length,
        results,
        timestamp: new Date().toISOString()
      });
    }

    // Action: discover (scan IP range for new miners)
    if (action === 'discover') {
      if (!ipRange) {
        return res.status(400).json({ error: 'ipRange required for discovery' });
      }

      const discovered = await discoverMinersInRange(ipRange);

      res.status(200).json({
        status: 'ok',
        discovered: discovered.length,
        miners: discovered,
        timestamp: new Date().toISOString()
      });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({ error: error.message });
  }
}
