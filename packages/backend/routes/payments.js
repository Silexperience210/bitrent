import express from 'express';
import { optionalJWT } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import paymentService from '../services/payment.js';

const router = express.Router();

/**
 * GET /payments/status/:invoice_hash
 * Check payment status
 */
router.get('/status/:invoice_hash', optionalJWT, async (req, res, next) => {
  try {
    const { invoice_hash } = req.params;

    const status = await paymentService.getPaymentStatus(invoice_hash);

    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /payments/webhook
 * NWC webhook for payment confirmation
 * (Optional - for real-time payment notifications)
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const { invoice_hash, status } = req.body;

    if (!invoice_hash || !status) {
      return next(new AppError('Missing invoice_hash or status', 400));
    }

    if (status === 'paid') {
      // Mark as paid in NWC service
      paymentService.markInvoicePaid(invoice_hash);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;
