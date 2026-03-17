/**
 * Cron Job: Miner Health Check
 * Runs every 5 minutes to check all miner status
 * Deploy as Vercel Cron Function
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMinerHealth(ipAddress) {
  try {
    const url = `http://${ipAddress}:80/api/status`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return { online: false, hashrate: 0 };

    const data = await response.json();
    return {
      online: true,
      hashrate: data.hashrate || 0,
      uptime: data.uptime || 0,
      temperature: data.temperature
    };
  } catch {
    return { online: false, hashrate: 0 };
  }
}

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔍 Starting miner health check...');

    // Fetch all miners
    const { data: miners, error } = await supabase
      .from('mineurs')
      .select('id, ip_address, name');

    if (error) throw error;

    const updates = [];
    let onlineCount = 0;

    // Check each miner
    for (const miner of miners) {
      const health = await checkMinerHealth(miner.ip_address);
      
      if (health.online) onlineCount++;

      // Update database
      await supabase
        .from('mineurs')
        .update({
          status: health.online ? 'online' : 'offline',
          uptime_percentage: Math.min(health.uptime || 0, 100),
          last_checked: new Date().toISOString(),
          metadata: {
            hashrate_live: health.hashrate,
            temperature: health.temperature,
            last_check_type: 'cron'
          }
        })
        .eq('id', miner.id);

      updates.push({
        name: miner.name,
        status: health.online ? 'online' : 'offline',
        hashrate: health.hashrate
      });
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'MINER_HEALTH_CHECK_CRON',
      resource_type: 'miner_fleet',
      changes: {
        total_checked: miners.length,
        online_count: onlineCount,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ Health check complete: ${onlineCount}/${miners.length} online`);

    res.status(200).json({
      status: 'ok',
      message: `Health check complete: ${onlineCount}/${miners.length} miners online`,
      miners_checked: miners.length,
      miners_online: onlineCount,
      updates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({ error: error.message });
  }
}

// Cron configuration for vercel.json
export const config = {
  schedule: '*/5 * * * *' // Every 5 minutes
};
