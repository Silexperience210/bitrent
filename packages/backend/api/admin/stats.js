/**
 * GET /api/admin/stats
 * Get platform statistics
 */

import { handleCors } from '@/lib/cors.js';
import { supabase } from '@/lib/supabase.js';
import * as authMiddleware from '@/lib/auth-middleware.js';
import * as response from '@/lib/response.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Method check
  if (req.method !== 'GET') {
    return response.sendError(res, 405, 'MethodNotAllowed', 'Method not allowed');
  }

  // Verify authentication and admin role
  const authResult = authMiddleware.verifyAuth(req);
  if (!authResult.authenticated) {
    return response.sendUnauthorized(res, authResult.error);
  }

  if (!authMiddleware.verifyAdminRole(authResult)) {
    return response.sendForbidden(res, 'Admin access required');
  }

  try {
    // Get total users
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total mineurs
    const { count: mineursCount, error: mineursError } = await supabase
      .from('mineurs')
      .select('*', { count: 'exact', head: true });

    // Get active mineurs
    const { count: activeMineursCount, error: activeMineursError } = await supabase
      .from('mineurs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total rentals
    const { count: rentalsCount, error: rentalsError } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true });

    // Get active rentals
    const { count: activeRentalsCount, error: activeRentalsError } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('rentals')
      .select('total_cost_sats')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, rental) => sum + rental.total_cost_sats, 0) || 0;

    return response.sendSuccess(res, {
      users: usersCount || 0,
      mineurs: mineursCount || 0,
      active_mineurs: activeMineursCount || 0,
      rentals: rentalsCount || 0,
      active_rentals: activeRentalsCount || 0,
      total_revenue_sats: totalRevenue,
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error('[ADMIN] Stats endpoint error:', error);
    return response.sendInternalError(res, 'Internal server error');
  }
}
