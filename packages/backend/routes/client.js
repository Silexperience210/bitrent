import express from 'express';
import { verifyJWT, optionalJWT } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import rentalService from '../services/rental.js';
import paymentService from '../services/payment.js';
import bitaxeService from '../services/bitaxe.js';

const router = express.Router();

/**
 * GET /client/mineurs
 * List available miners
 */
router.get('/mineurs', optionalJWT, async (req, res, next) => {
  try {
    const { data: mineurs, error } = await db.mineurs()
      .select('*')
      .eq('status', 'active')
      .order('price_per_hour_sats', { ascending: true });

    if (error) throw error;

    res.json(mineurs || []);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /client/mineurs/:id
 * Get specific miner details with current status
 */
router.get('/mineurs/:id', optionalJWT, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: miner, error } = await db.mineurs()
      .select('*')
      .eq('id', id)
      .single();

    if (error || !miner) {
      return next(new AppError('Miner not found', 404));
    }

    // Get current status
    const status = await bitaxeService.getMinerStatus(miner.ip);

    res.json({
      ...miner,
      current_status: status.error ? null : status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /client/rentals
 * Create new rental (start rental, create invoice)
 */
router.post('/rentals', verifyJWT, validate(schemas.createRental), async (req, res, next) => {
  try {
    const { mineur_id, duration_hours } = req.body;
    const { pubkey } = req.user;

    const rental = await rentalService.createRental(
      pubkey,
      mineur_id,
      duration_hours
    );

    res.status(201).json(rental);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /client/rentals/:id
 * Get rental status
 */
router.get('/rentals/:id', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pubkey } = req.user;

    const rental = await rentalService.getRentalDetails(id);

    if (!rental) {
      return next(new AppError('Rental not found', 404));
    }

    // Verify ownership
    if (rental.user_pubkey !== pubkey) {
      return next(new AppError('Unauthorized', 403));
    }

    res.json(rental);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /client/rentals/:id/verify-payment
 * Verify payment and activate rental
 */
router.post('/rentals/:id/verify-payment', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pubkey } = req.user;

    // Get rental to verify ownership
    const rental = await rentalService.getRentalDetails(id);

    if (!rental) {
      return next(new AppError('Rental not found', 404));
    }

    if (rental.user_pubkey !== pubkey) {
      return next(new AppError('Unauthorized', 403));
    }

    // Get payment info
    const { data: payment } = await db.payments()
      .select('invoice_hash')
      .eq('rental_id', id)
      .eq('status', 'pending')
      .single();

    if (!payment) {
      return next(new AppError('No pending payment found', 404));
    }

    // Verify payment
    const result = await paymentService.verifyAndConfirmPayment(payment.invoice_hash);

    if (!result.success) {
      return res.status(202).json({
        status: 'pending',
        message: 'Payment not yet confirmed',
      });
    }

    // Get updated rental
    const updatedRental = await rentalService.getRentalDetails(id);

    res.json({
      status: 'success',
      rental: updatedRental,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /client/rentals
 * Get active rentals
 */
router.get('/', verifyJWT, async (req, res, next) => {
  try {
    const { pubkey } = req.user;

    const rentals = await rentalService.getActiveRentals(pubkey);

    res.json(rentals);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /client/rentals/history
 * Get rental history
 */
router.get('/history', verifyJWT, async (req, res, next) => {
  try {
    const { pubkey } = req.user;
    const { limit = 50 } = req.query;

    const rentals = await rentalService.getRentalHistory(pubkey, parseInt(limit, 10));

    res.json(rentals);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /client/rentals/:id/cancel
 * Cancel rental (only if pending payment)
 */
router.post('/:id/cancel', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pubkey } = req.user;

    // Get rental to verify ownership
    const rental = await rentalService.getRentalDetails(id);

    if (!rental) {
      return next(new AppError('Rental not found', 404));
    }

    if (rental.user_pubkey !== pubkey) {
      return next(new AppError('Unauthorized', 403));
    }

    const result = await rentalService.cancelRental(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
