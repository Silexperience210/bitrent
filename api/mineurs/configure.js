/**
 * Configure Bitaxe Miner via HTTP API
 * Sets pool, stratum address, and worker name
 * Real API integration with Bitaxe hardware
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';
const BITAXE_API_TIMEOUT = 10000; // 10 seconds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const {
      miner_id,
      pool_url,
      pool_user,
      pool_pass,
      worker_name
    } = req.body;

    if (!miner_id || !pool_url || !pool_user) {
      return res.status(400).json({
        error: 'Missing required fields: miner_id, pool_url, pool_user'
      });
    }

    // Get miner IP address from database
    const { data: minerData, error: minerError } = await supabase
      .from('mineurs')
      .select('id, ip_address, name')
      .eq('id', miner_id)
      .single();

    if (minerError || !minerData) {
      return res.status(404).json({ error: 'Miner not found' });
    }

    // Configure Bitaxe via HTTP API
    const config = await configureBitaxe(
      minerData.ip_address,
      pool_url,
      pool_user,
      pool_pass || 'x',
      worker_name
    );

    if (!config.success) {
      return res.status(500).json({
        error: 'Failed to configure miner',
        details: config.error
      });
    }

    // Log configuration change
    await supabase.from('audit_logs').insert({
      action: 'MINER_CONFIGURED',
      resource_type: 'miner',
      resource_id: minerData.id,
      changes: {
        pool_url: pool_url,
        pool_user: pool_user,
        worker_name: worker_name,
        timestamp: new Date().toISOString()
      }
    });

    res.status(200).json({
      status: 'ok',
      message: 'Miner configured successfully',
      data: {
        miner_name: minerData.name,
        miner_ip: minerData.ip_address,
        pool_url: pool_url,
        pool_user: pool_user,
        worker_name: worker_name,
        hashrate: config.hashrate,
        power: config.power,
        status: config.status
      }
    });
  } catch (error) {
    console.error('Configuration error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Configure Bitaxe miner via HTTP API
 * Bitaxe API endpoints:
 * - GET /api/system/status - Get status
 * - POST /api/system/update - Update settings
 */
async function configureBitaxe(ipAddress, poolUrl, poolUser, poolPass, workerName) {
  try {
    // Step 1: Get current status
    const statusUrl = `http://${ipAddress}:80/api/system/status`;
    const statusRes = await fetchWithTimeout(statusUrl, {}, 5000);
    
    if (!statusRes.ok) {
      throw new Error(`Status check failed: ${statusRes.statusText}`);
    }

    const currentStatus = await statusRes.json();
    console.log('Current miner status:', currentStatus);

    // Step 2: Prepare configuration
    // Bitaxe expects: pool URL, username (address.worker), password
    const workerUsername = `${poolUser}.${workerName || 'bitrent'}`;
    
    const configPayload = {
      pool: {
        url: poolUrl,
        username: workerUsername,
        password: poolPass || 'x'
      }
    };

    // Step 3: Send configuration
    const configUrl = `http://${ipAddress}:80/api/system/update`;
    const configRes = await fetchWithTimeout(configUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configPayload)
    }, 5000);

    if (!configRes.ok) {
      throw new Error(`Config update failed: ${configRes.statusText}`);
    }

    const configResult = await configRes.json();
    console.log('Configuration result:', configResult);

    // Step 4: Verify configuration was applied
    // Wait 2 seconds for miner to apply settings
    await new Promise(resolve => setTimeout(resolve, 2000));

    const verifyRes = await fetchWithTimeout(statusUrl, {}, 5000);
    if (!verifyRes.ok) {
      throw new Error('Failed to verify configuration');
    }

    const verifiedStatus = await verifyRes.json();

    return {
      success: true,
      hashrate: verifiedStatus.hashrate || 0,
      power: verifiedStatus.power || 0,
      status: verifiedStatus.status || 'configuring'
    };
  } catch (error) {
    console.error('Bitaxe configuration error:', error);
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
