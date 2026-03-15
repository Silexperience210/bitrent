import express from 'express';
import { getDatabase } from '../config/database.js';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const db = getDatabase();
    const { data, error } = await db.from('users').select('count(*)').limit(1);

    if (error) {
      return res.status(503).json({
        status: 'error',
        database: 'disconnected',
        error: error.message,
      });
    }

    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'error',
      error: error.message,
    });
  }
});

/**
 * GET /readiness
 * Readiness check (K8s compatible)
 */
router.get('/readiness', async (req, res) => {
  try {
    const db = getDatabase();
    await db.from('users').select('count(*)').limit(1);

    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

export default router;
