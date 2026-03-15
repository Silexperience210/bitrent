/**
 * Admin Authorization Middleware
 * Requires user to have admin role
 */

import { requireAuth } from './requireAuth.js';
import config from '../config/env.js';
import { db } from '../config/database.js';

/**
 * Require admin role
 * Must be called after requireAuth middleware
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.user.pubkey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    // Optional: Verify admin status in database (in case it changed)
    try {
      const { data: user, error } = await db.users()
        .select('is_admin')
        .eq('pubkey', req.user.pubkey)
        .single();

      if (error || !user || !user.is_admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }
    } catch (dbError) {
      console.error('[ADMIN] Database check error:', dbError);
      // Continue anyway - allow if JWT claims admin
    }

    next();
  } catch (error) {
    console.error('[ADMIN] Authorization error:', error);
    return res.status(500).json({
      error: 'InternalError',
      message: 'Authentication check failed'
    });
  }
};

/**
 * Combined middleware: requireAuth then requireAdmin
 */
export const adminRequired = [requireAuth, requireAdmin];

export default {
  requireAdmin,
  adminRequired,
};
