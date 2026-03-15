# BitRent Analytics and Reporting Guide

Complete guide to analytics views, dashboards, and business intelligence.

## Overview

BitRent provides comprehensive analytics through pre-computed views, daily statistics, and real-time metrics.

## Analytics Tables

### `analytics_daily` - Daily Summary

Automatically calculated metrics for each day.

```sql
SELECT * FROM analytics_daily 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Columns:
-- - date: YYYY-MM-DD
-- - total_rentals: Number of rentals created
-- - total_sats_revenue: Total revenue (completed rentals)
-- - active_mineurs: Number of available mineurs
-- - avg_rental_duration: Average rental length (minutes)
-- - uptime_avg: Average miner uptime percentage
```

## Analytics Views

### Revenue Views

#### `v_revenue_by_miner` - Per-Miner Analytics
```sql
SELECT * FROM v_revenue_by_miner 
ORDER BY total_revenue_sats DESC 
LIMIT 10;

-- Shows:
-- - Total rentals per miner
-- - Completed vs pending rentals
-- - Total revenue
-- - Average rental duration
-- - Uptime percentage
```

#### `v_revenue_by_user` - Per-User Spending
```sql
SELECT * FROM v_revenue_by_user 
ORDER BY total_sats_spent DESC 
LIMIT 20;

-- Shows:
-- - User pubkey
-- - Total spending
-- - Total rental minutes
-- - Last rental date
```

### Usage Views

#### `v_top_mineurs_by_usage` - Most Popular Mineurs
```sql
SELECT * FROM v_top_mineurs_by_usage LIMIT 10;

-- Shows:
-- - Miner name and IP
-- - Total rentals
-- - Total revenue
-- - Usage percentage of total platform rentals
```

#### `v_top_users_by_spending` - Top Spenders
```sql
SELECT * FROM v_top_users_by_spending LIMIT 20;

-- Shows:
-- - User pubkey
-- - Total spent
-- - Spending as % of platform revenue
```

### Operational Views

#### `v_active_rentals` - Current Activity
```sql
SELECT * FROM v_active_rentals;

-- Real-time list of:
-- - Active and pending rentals
-- - Time remaining
-- - User and miner details
```

#### `v_pending_payments` - Awaiting Payment
```sql
SELECT * FROM v_pending_payments 
WHERE status = 'pending'
ORDER BY expires_at ASC;

-- Shows:
-- - Pending invoices
-- - Time until expiry
-- - Associated user and miner
```

#### `v_available_mineurs` - Inventory
```sql
SELECT * FROM v_available_mineurs 
WHERE status = 'online'
ORDER BY uptime_percentage DESC;

-- Lists:
-- - Available mineurs for rent
-- - Hashrate and pricing
-- - Uptime and revenue
```

### Performance Views

#### `v_miner_performance` - Miner Metrics
```sql
SELECT * FROM v_miner_performance 
WHERE uptime_percentage > 90
ORDER BY total_revenue_sats DESC;

-- Shows:
-- - Miner status and uptime
-- - Total revenue
-- - Current active rentals
-- - Current earning rate (sats/minute)
```

#### `v_payment_status_summary` - Payment Distribution
```sql
SELECT * FROM v_payment_status_summary;

-- Breakdown by status:
-- - Count of payments
-- - Total satoshis
-- - Oldest and newest payment
```

### Time-Series Views

#### `v_daily_revenue` - Daily Trend Data
```sql
SELECT * FROM v_daily_revenue 
ORDER BY date DESC 
LIMIT 30;

-- Daily metrics:
-- - Rental count
-- - Completed revenue
-- - Average duration
```

#### `v_hourly_usage` - Hourly Activity (Last 7 Days)
```sql
SELECT * FROM v_hourly_usage 
WHERE hour > NOW() - INTERVAL '7 days'
ORDER BY hour DESC;

-- Hourly breakdown:
-- - Rental count
-- - Unique users and mineurs
-- - Total satoshis
```

## Dashboard Queries

### Overview Dashboard

```sql
-- Top KPIs
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM mineurs WHERE status != 'offline') as active_mineurs,
  (SELECT COUNT(*) FROM rentals WHERE status = 'active') as current_rentals,
  (SELECT COALESCE(SUM(total_sats), 0) FROM rentals 
   WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') as today_revenue,
  (SELECT COALESCE(SUM(total_sats), 0) FROM rentals 
   WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') as month_revenue;
```

### User Dashboard

```sql
-- User's personal metrics
SELECT 
  u.pubkey_nostr,
  COUNT(DISTINCT r.id) as total_rentals,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_sats ELSE 0 END), 0) as total_spent,
  COALESCE(AVG(r.duration_minutes), 0) as avg_rental_duration,
  MAX(r.created_at) as last_rental
FROM users u
LEFT JOIN rentals r ON u.id = r.user_id
WHERE u.id = 'user-123'
GROUP BY u.id;
```

### Miner Owner Dashboard

```sql
-- Miner owner's earnings
SELECT 
  m.name,
  m.status,
  m.uptime_percentage,
  m.total_revenue_sats,
  COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rentals,
  COUNT(r.id) FILTER (WHERE r.status = 'completed') as completed_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_sats ELSE 0 END), 0) as earned
FROM mineurs m
LEFT JOIN rentals r ON m.id = r.mineur_id
WHERE m.owner_id = 'owner-123'
GROUP BY m.id
ORDER BY m.total_revenue_sats DESC;
```

### Admin Dashboard

```sql
-- Platform-wide metrics
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM mineurs) as total_mineurs,
  (SELECT COUNT(*) FROM rentals) as total_rentals,
  (SELECT COALESCE(SUM(total_sats), 0) FROM rentals WHERE status = 'completed') as total_revenue,
  (SELECT COUNT(*) FROM payments WHERE status = 'confirmed') as confirmed_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
  (SELECT AVG(uptime_percentage) FROM mineurs) as avg_uptime,
  (SELECT COUNT(*) FROM rentals WHERE status = 'active') as current_active_rentals;
```

## Reports

### Daily Revenue Report
```javascript
async function getDailyRevenueReport(startDate, endDate) {
  const { data } = await supabase
    .from('v_daily_revenue')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  
  // Calculate totals
  const totalRevenue = data.reduce((sum, day) => sum + day.completed_revenue, 0);
  const avgDaily = totalRevenue / data.length;
  const peakDay = data.reduce((max, day) => 
    day.completed_revenue > max.completed_revenue ? day : max
  );
  
  return {
    period: { startDate, endDate },
    days: data.length,
    totalRevenue,
    avgDaily,
    peakDay,
    details: data
  };
}
```

### Miner Performance Report
```javascript
async function getMinerPerformanceReport(minerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: rentals } = await supabase
    .from('rentals')
    .select('*')
    .eq('mineur_id', minerId)
    .gte('created_at', startDate.toISOString());
  
  return {
    minerId,
    period: days,
    totalRentals: rentals.length,
    completedRentals: rentals.filter(r => r.status === 'completed').length,
    totalRevenue: rentals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.total_sats, 0),
    avgRentalDuration: Math.round(
      rentals.reduce((sum, r) => sum + r.duration_minutes, 0) / rentals.length
    ),
    utilizationRate: (rentals.length / (days * 24 * 60)) * 100
  };
}
```

### User Spending Report
```javascript
async function getUserSpendingReport(userId) {
  const { data: stats } = await supabase
    .from('v_user_statistics')
    .select('*')
    .eq('id', userId)
    .single();
  
  const { data: history } = await supabase
    .from('v_user_rental_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return {
    user: stats.pubkey_nostr,
    summary: {
      totalSpent: stats.total_sats_spent,
      totalRentals: stats.total_rentals,
      avgRentalCost: stats.avg_rental_cost,
      lastRentalDate: stats.last_rental_date
    },
    recentRentals: history
  };
}
```

## Analytics Calculation

### Auto-Calculation (Triggers)

Daily analytics are automatically calculated by trigger at 00:05 UTC:

```sql
-- Triggered daily
PERFORM calculate_daily_analytics(CURRENT_DATE);
```

### Manual Recalculation

```javascript
// Recalculate specific date
async function recalculateAnalytics(date) {
  const { data, error } = await supabase.rpc('calculate_daily_analytics', {
    target_date: date.toISOString().split('T')[0]
  });
  
  if (error) throw error;
  return data;
}

// Recalculate date range
async function recalculateAnalyticsRange(startDate, endDate) {
  const { data, error } = await supabase.rpc('recalculate_analytics', {
    start_date: startDate,
    end_date: endDate
  });
  
  if (error) throw error;
  return data;
}
```

## Exporting Data

### Export to CSV

```javascript
import { parse as json2csv } from 'json2csv';

async function exportRevenueReport(startDate, endDate) {
  const { data } = await supabase
    .from('v_daily_revenue')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  
  const csv = json2csv(data);
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenue_report_${startDate}_${endDate}.csv`;
  a.click();
}
```

### Export to JSON

```javascript
async function exportAnalytics(reportType, filters) {
  let query = supabase.from(`v_${reportType}`).select('*');
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data } = await query;
  
  return {
    exportDate: new Date().toISOString(),
    reportType,
    filters,
    data,
    count: data.length
  };
}
```

## Caching Analytics

```javascript
// Cache analytics results to reduce queries
const cache = new Map();

async function getCachedAnalytics(type, params) {
  const key = `${type}:${JSON.stringify(params)}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  // Fetch fresh data
  const result = await fetchAnalytics(type, params);
  
  // Cache for 1 hour
  cache.set(key, result);
  setTimeout(() => cache.delete(key), 3600000);
  
  return result;
}
```

## Real-Time Updates

### Subscribe to Rental Changes
```javascript
supabase
  .channel('rentals')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'rentals' },
    (payload) => {
      console.log('Rental changed:', payload);
      // Update analytics cache
      cache.clear();
      // Refresh dashboard
      refreshDashboard();
    }
  )
  .subscribe();
```

## Performance Metrics

### Query Performance

| Query | Typical Time | Rows |
|-------|--------------|------|
| Daily revenue (30 days) | 5ms | 30 |
| Top mineurs (10) | 10ms | 10 |
| User stats | 20ms | 1 |
| Active rentals | 15ms | 50-100 |

### Index Size

```sql
SELECT 
  schemaname,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename IN ('analytics_daily', 'rentals', 'payments')
ORDER BY pg_relation_size(indexrelid) DESC;
```

## See Also

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - View definitions
- [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) - Query optimization
- [MIGRATIONS.md](./MIGRATIONS.md) - Analytics table setup
