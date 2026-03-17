/**
 * Get Rental Status & Mining Configuration
 * Returns: pool config, payout address, worker name, mining instructions
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { rental_id } = req.query;

    if (!rental_id) {
      return res.status(400).json({ error: 'rental_id required' });
    }

    // Get rental
    const { data: rentalData, error: rentalError } = await supabase
      .from('rentals')
      .select(`
        *,
        miner:mineurs(name, ip_address, port, status),
        payment:payments(status, confirmed_at)
      `)
      .eq('id', rental_id)
      .single();

    if (rentalError || !rentalData) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    const isActive = rentalData.status === 'active';
    const isPaymentConfirmed = rentalData.payment?.status === 'confirmed';

    res.status(200).json({
      status: 'ok',
      data: {
        rental_id: rentalData.id,
        status: rentalData.status,
        miner_name: rentalData.miner.name,
        miner_ip: rentalData.miner.ip_address,
        miner_port: rentalData.miner.port,
        start_time: rentalData.start_time,
        end_time: rentalData.end_time,
        duration_minutes: rentalData.duration_minutes,
        elapsed_minutes: calculateElapsed(rentalData.start_time),
        remaining_minutes: calculateRemaining(rentalData.end_time),
        total_cost_sats: rentalData.total_sats,
        
        // Mining configuration
        mining_config: isPaymentConfirmed ? {
          pool_type: rentalData.metadata.pool_type,
          pool_name: getPoolName(rentalData.metadata.pool_type),
          pool_url: rentalData.metadata.pool_url,
          payout_address: rentalData.metadata.payout_address,
          worker_name: rentalData.metadata.worker_name,
          
          // Stratum configuration
          stratum: {
            server: rentalData.metadata.pool_url,
            username: `${rentalData.metadata.payout_address}.${rentalData.metadata.worker_name}`,
            password: 'x'
          },
          
          // Mining instructions
          instructions: {
            cgminer: `cgminer -o ${rentalData.metadata.pool_url} -u ${rentalData.metadata.payout_address}.${rentalData.metadata.worker_name} -p x`,
            bfgminer: `bfgminer -o ${rentalData.metadata.pool_url} -u ${rentalData.metadata.payout_address}.${rentalData.metadata.worker_name} -p x`,
            asicboost: `asicboost --stratum ${rentalData.metadata.pool_url} --user ${rentalData.metadata.payout_address}.${rentalData.metadata.worker_name}`
          }
        } : null,
        
        // Payment info
        payment: {
          status: rentalData.payment?.status || 'pending',
          confirmed: isPaymentConfirmed,
          confirmed_at: rentalData.payment?.confirmed_at,
          message: isPaymentConfirmed 
            ? '✅ Payment confirmed. Mining is active!'
            : '⏳ Waiting for payment confirmation...'
        },
        
        // Status messages
        message: getStatusMessage(rentalData.status, isPaymentConfirmed),
        action_required: !isPaymentConfirmed && rentalData.status === 'pending'
      }
    });
  } catch (error) {
    console.error('Rental status error:', error);
    res.status(500).json({ error: error.message });
  }
}

function calculateElapsed(startTime) {
  const elapsed = Date.now() - new Date(startTime).getTime();
  return Math.floor(elapsed / (60 * 1000));
}

function calculateRemaining(endTime) {
  const remaining = new Date(endTime).getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / (60 * 1000)));
}

function getPoolName(poolType) {
  const pools = {
    'stratum-v2': 'Stratum V2',
    'ocean': 'OCEAN',
    'foundry': 'Foundry USA',
    'luxor': 'Luxor',
    'antpool': 'AntPool'
  };
  return pools[poolType] || poolType;
}

function getStatusMessage(status, paymentConfirmed) {
  if (status === 'completed') {
    return '✅ Rental completed. Mining has stopped.';
  }
  if (status === 'cancelled') {
    return '❌ Rental cancelled.';
  }
  if (status === 'active' && paymentConfirmed) {
    return '🔥 Mining is active! You can monitor progress on your pool dashboard.';
  }
  if (status === 'pending' && !paymentConfirmed) {
    return '⏳ Rental pending. Complete the Lightning payment to start mining.';
  }
  return 'Status unknown';
}
