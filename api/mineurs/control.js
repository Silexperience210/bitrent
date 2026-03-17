/**
 * Bitaxe Miner Control
 * Start/stop mining, adjust power, get live stats
 */

import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { miner_id, action, power_level } = req.body || req.query;

    if (!miner_id) {
      return res.status(400).json({ error: 'miner_id required' });
    }

    // Get miner IP
    const { data: minerData } = await supabase
      .from('mineurs')
      .select('ip_address, name')
      .eq('id', miner_id)
      .single();

    if (!minerData) {
      return res.status(404).json({ error: 'Miner not found' });
    }

    let result;

    // GET: Get live status
    if (req.method === 'GET') {
      result = await getMinerStatus(minerData.ip_address);
    }
    // POST: Control actions
    else {
      switch (action) {
        case 'start':
          result = await startMining(minerData.ip_address);
          break;
        case 'stop':
          result = await stopMining(minerData.ip_address);
          break;
        case 'power':
          result = await setPower(minerData.ip_address, power_level);
          break;
        case 'reboot':
          result = await rebootMiner(minerData.ip_address);
          break;
        default:
          return res.status(400).json({ error: 'Unknown action' });
      }
    }

    if (!result.success) {
      return res.status(500).json({
        error: 'Control failed',
        details: result.error
      });
    }

    // Log action
    if (req.method === 'POST') {
      await supabase.from('audit_logs').insert({
        action: `MINER_${action.toUpperCase()}`,
        resource_type: 'miner',
        resource_id: miner_id,
        changes: { action, timestamp: new Date().toISOString() }
      });
    }

    res.status(200).json({
      status: 'ok',
      data: result.data
    });
  } catch (error) {
    console.error('Control error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get live miner status from Bitaxe
 */
async function getMinerStatus(ipAddress) {
  try {
    const url = `http://${ipAddress}:80/api/system/status`;
    const res = await fetchWithTimeout(url, {}, 5000);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    return {
      success: true,
      data: {
        hashrate: data.hashrate || 0,
        hashrate_unit: data.hashrate_unit || 'TH/s',
        power_consumption: data.power || 0,
        temperature: data.temperature || 0,
        uptime: data.uptime || 0,
        pool: data.pool || {},
        mining_active: data.mining_active || false,
        firmware_version: data.firmware_version || 'unknown',
        model: data.model || 'Bitaxe'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start mining
 */
async function startMining(ipAddress) {
  try {
    const url = `http://${ipAddress}:80/api/mining/start`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, 5000);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      data: { message: 'Mining started', status: data.status }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Stop mining
 */
async function stopMining(ipAddress) {
  try {
    const url = `http://${ipAddress}:80/api/mining/stop`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, 5000);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return {
      success: true,
      data: { message: 'Mining stopped' }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Set power level (0-100%)
 */
async function setPower(ipAddress, powerLevel) {
  try {
    if (!powerLevel || powerLevel < 0 || powerLevel > 100) {
      throw new Error('Power level must be 0-100');
    }

    const url = `http://${ipAddress}:80/api/system/power`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: powerLevel })
    }, 5000);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return {
      success: true,
      data: { message: `Power set to ${powerLevel}%`, power_level: powerLevel }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reboot miner
 */
async function rebootMiner(ipAddress) {
  try {
    const url = `http://${ipAddress}:80/api/system/reboot`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, 5000);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return {
      success: true,
      data: { message: 'Miner rebooting...' }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
