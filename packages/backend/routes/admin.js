import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import bitaxeService from '../services/bitaxe.js';
import rentalService from '../services/rental.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyJWT, requireAdmin);

/**
 * GET /admin/mineurs
 * List all miners
 */
router.get('/mineurs', async (req, res, next) => {
  try {
    const { data: mineurs, error } = await db.mineurs()
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(mineurs || []);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/mineurs
 * Add new miner
 */
router.post('/mineurs', validate(schemas.createMineur), async (req, res, next) => {
  try {
    const { ip, hashrate, model, price_per_hour_sats } = req.body;

    // Verify miner is reachable
    const status = await bitaxeService.getMinerStatus(ip);
    if (status.error) {
      return next(new AppError(`Cannot reach miner at ${ip}`, 400));
    }

    const { data, error } = await db.mineurs().insert({
      id: uuidv4(),
      ip,
      hashrate,
      model,
      price_per_hour_sats,
      status: 'active',
      created_at: new Date(),
    });

    if (error) throw error;

    res.status(201).json(data?.[0] || { ip, hashrate, model, price_per_hour_sats });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/mineurs/:id
 * Update miner
 */
router.put('/mineurs/:id', validate(schemas.updateMineur), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await db.mineurs()
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    res.json(data?.[0] || { id, ...updates });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/mineurs/:id
 * Delete miner
 */
router.delete('/mineurs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if miner has active rentals
    const { data: rentals } = await db.rentals()
      .select('id')
      .eq('mineur_id', id)
      .eq('status', 'active');

    if (rentals && rentals.length > 0) {
      return next(new AppError('Cannot delete miner with active rentals', 400));
    }

    const { error } = await db.mineurs()
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/rentals
 * List all active rentals
 */
router.get('/rentals', async (req, res, next) => {
  try {
    const { data: rentals, error } = await db.rentals()
      .select(`
        *,
        mineurs:mineur_id (
          id,
          model,
          hashrate,
          ip
        ),
        payments (
          status,
          amount_sats
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(rentals || []);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/stats
 * Get platform statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Total miners
    const { count: totalMiners } = await db.mineurs()
      .select('id', { count: 'exact' });

    // Active miners
    const { count: activeMiners } = await db.mineurs()
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    // Active rentals
    const { count: activeRentals } = await db.rentals()
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    // Total revenue (confirmed payments)
    const { data: payments } = await db.payments()
      .select('amount_sats')
      .eq('status', 'confirmed');

    const totalRevenue = payments?.reduce((sum, p) => sum + p.amount_sats, 0) || 0;

    // Total rentals completed
    const { count: totalRentalsCompleted } = await db.rentals()
      .select('id', { count: 'exact' })
      .eq('status', 'completed');

    res.json({
      miners: {
        total: totalMiners || 0,
        active: activeMiners || 0,
      },
      rentals: {
        active: activeRentals || 0,
        completed: totalRentalsCompleted || 0,
      },
      revenue: {
        total_sats: totalRevenue,
        confirmed_payments: payments?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/mineurs/:id/status
 * Get miner real-time status from Bitaxe
 */
router.get('/mineurs/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: miner, error } = await db.mineurs()
      .select('ip')
      .eq('id', id)
      .single();

    if (error || !miner) {
      return next(new AppError('Miner not found', 404));
    }

    const status = await bitaxeService.getMinerStatus(miner.ip);

    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/mineurs/:id/metrics
 * Get miner metrics
 */
router.get('/mineurs/:id/metrics', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: miner, error } = await db.mineurs()
      .select('ip')
      .eq('id', id)
      .single();

    if (error || !miner) {
      return next(new AppError('Miner not found', 404));
    }

    const metrics = await bitaxeService.getMinerMetrics(miner.ip);

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/mineurs/:id/stats
 * Get stats for a specific miner
 */
router.get('/mineurs/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;

    const stats = await rentalService.getMinerStats(id);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
