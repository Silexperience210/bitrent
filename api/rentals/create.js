/**
 * Create Rental with Pool Configuration
 * Client can:
 * - Choose mining pool
 * - Set payout address
 * - Select duration
 * - Pay with Lightning
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';

// Supported mining pools
const POOLS = {
  'stratum-v2': {
    name: 'Stratum V2',
    url: 'stratum2+tcp://pool.example.com:3333',
    fee: 0.01 // 1%
  },
  'ocean': {
    name: 'OCEAN',
    url: 'stratum+tcp://mine.ocean.xyz:3333',
    fee: 0.005 // 0.5%
  },
  'foundry': {
    name: 'Foundry USA',
    url: 'stratum+tcp://mining.foundrydigital.com:3333',
    fee: 0.015 // 1.5%
  },
  'luxor': {
    name: 'Luxor',
    url: 'stratum+tcp://us.luxor.tech:3333',
    fee: 0.02 // 2%
  },
  'antpool': {
    name: 'AntPool',
    url: 'stratum+tcp://stratum-na.antpool.com:3333',
    fee: 0.025 // 2.5%
  }
};

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

    // Get rental parameters
    const {
      miner_id,
      duration_minutes,
      pool_type,
      payout_address,
      custom_worker_name
    } = req.body;

    // Validate inputs
    if (!miner_id || !duration_minutes || !pool_type || !payout_address) {
      return res.status(400).json({
        error: 'Missing required fields: miner_id, duration_minutes, pool_type, payout_address'
      });
    }

    if (duration_minutes < 1 || duration_minutes > 1440) {
      return res.status(400).json({ error: 'Duration must be 1-1440 minutes' });
    }

    if (!POOLS[pool_type]) {
      return res.status(400).json({
        error: `Invalid pool. Supported: ${Object.keys(POOLS).join(', ')}`
      });
    }

    // Validate payout address format (Bitcoin address)
    if (!isValidBitcoinAddress(payout_address)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address' });
    }

    // Get miner details
    const { data: minerData, error: minerError } = await supabase
      .from('mineurs')
      .select('id, name, sats_per_minute, status')
      .eq('id', miner_id)
      .single();

    if (minerError || !minerData) {
      return res.status(404).json({ error: 'Miner not found' });
    }

    if (minerData.status !== 'online') {
      return res.status(400).json({ error: 'Miner is not online' });
    }

    // Calculate costs
    const baseCost = minerData.sats_per_minute * duration_minutes;
    const poolFee = baseCost * POOLS[pool_type].fee;
    const totalCost = baseCost + poolFee;

    // Create rental
    const { data: rentalData, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        miner_id: miner_id,
        user_id: decoded.pubkey, // Store pubkey as user_id for demo
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + duration_minutes * 60 * 1000).toISOString(),
        duration_minutes: duration_minutes,
        sats_per_minute: minerData.sats_per_minute,
        total_sats: totalCost,
        status: 'pending',
        metadata: {
          pool_type: pool_type,
          pool_url: POOLS[pool_type].url,
          pool_fee_percent: POOLS[pool_type].fee * 100,
          payout_address: payout_address,
          worker_name: custom_worker_name || `bitrent-${Date.now()}`,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (rentalError) {
      console.error('Rental creation error:', rentalError);
      return res.status(500).json({ error: 'Failed to create rental' });
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      action: 'RENTAL_CREATED',
      resource_type: 'rental',
      resource_id: rentalData.id,
      changes: {
        miner_id,
        pool_type,
        payout_address,
        duration_minutes,
        total_sats: totalCost
      }
    });

    res.status(201).json({
      status: 'ok',
      data: {
        rental_id: rentalData.id,
        miner_name: minerData.name,
        duration_minutes: duration_minutes,
        pool_type: pool_type,
        pool_name: POOLS[pool_type].name,
        pool_url: POOLS[pool_type].url,
        payout_address: payout_address,
        worker_name: rentalData.metadata.worker_name,
        base_cost_sats: baseCost,
        pool_fee_sats: Math.floor(poolFee),
        total_cost_sats: totalCost,
        pool_fee_percent: POOLS[pool_type].fee * 100,
        message: 'Rental created. Waiting for payment...'
      }
    });
  } catch (error) {
    console.error('Rental error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Validate Bitcoin address (P2PKH, P2SH, P2WPKH, P2WSH)
 */
function isValidBitcoinAddress(address) {
  // P2PKH (1...)
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  
  // P2SH (3...)
  if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  
  // P2WPKH, P2WSH (bc1...)
  if (/^bc1[a-z0-9]{39,59}$/.test(address)) return true;
  
  return false;
}
