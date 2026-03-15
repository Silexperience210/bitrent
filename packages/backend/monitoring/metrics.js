/**
 * Prometheus Metrics Configuration
 * BitRent Phase 4: Performance Monitoring
 */

import client from 'prom-client';

/**
 * Default metrics
 */
client.collectDefaultMetrics();

/**
 * HTTP Request metrics
 */
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestCount = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [1000, 10000, 100000, 1000000],
});

const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1000, 10000, 100000, 1000000],
});

/**
 * Database metrics
 */
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const dbQueryCount = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'table', 'status'],
});

const dbConnectionPoolSize = new client.Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['pool_name'],
});

const dbConnectionPoolUsage = new client.Gauge({
  name: 'db_connection_pool_usage',
  help: 'Database connection pool usage',
  labelNames: ['pool_name'],
});

/**
 * Authentication metrics
 */
const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'status'],
});

const authDuration = new client.Histogram({
  name: 'auth_duration_seconds',
  help: 'Authentication duration in seconds',
  labelNames: ['method'],
  buckets: [0.1, 0.5, 1, 2],
});

const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

/**
 * Payment metrics
 */
const paymentAmount = new client.Histogram({
  name: 'payment_amount_btc',
  help: 'Payment amount in BTC',
  labelNames: ['status'],
  buckets: [0.00001, 0.0001, 0.001, 0.01, 0.1, 1],
});

const paymentCount = new client.Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['status', 'method'],
});

const paymentProcessingDuration = new client.Histogram({
  name: 'payment_processing_duration_seconds',
  help: 'Payment processing duration in seconds',
  labelNames: ['method'],
  buckets: [1, 5, 10, 30, 60, 300],
});

/**
 * Rental metrics
 */
const rentalCount = new client.Counter({
  name: 'rentals_total',
  help: 'Total number of rentals',
  labelNames: ['status'],
});

const rentalDuration = new client.Histogram({
  name: 'rental_duration_hours',
  help: 'Rental duration in hours',
  labelNames: ['miner_model'],
  buckets: [0.5, 1, 2, 4, 8, 24, 72, 168],
});

const activeRentals = new client.Gauge({
  name: 'active_rentals',
  help: 'Number of active rentals',
});

const rentalRevenue = new client.Gauge({
  name: 'rental_revenue_btc',
  help: 'Total rental revenue in BTC',
});

/**
 * Miner metrics
 */
const minerCount = new client.Gauge({
  name: 'miners_total',
  help: 'Total number of miners',
});

const minerStatus = new client.Gauge({
  name: 'miner_status',
  help: 'Miner status (1=available, 0=unavailable)',
  labelNames: ['miner_id', 'model'],
});

const minerHashRate = new client.Gauge({
  name: 'miner_hashrate_gh',
  help: 'Miner hash rate in GH/s',
  labelNames: ['miner_id', 'model'],
});

const minerUptime = new client.Gauge({
  name: 'miner_uptime_hours',
  help: 'Miner uptime in hours',
  labelNames: ['miner_id'],
});

const minerPowerConsumption = new client.Gauge({
  name: 'miner_power_consumption_watts',
  help: 'Miner power consumption in watts',
  labelNames: ['miner_id'],
});

const minerTemperature = new client.Gauge({
  name: 'miner_temperature_celsius',
  help: 'Miner temperature in Celsius',
  labelNames: ['miner_id', 'sensor'],
});

/**
 * Business metrics
 */
const totalRevenue = new client.Gauge({
  name: 'total_revenue_btc',
  help: 'Total platform revenue in BTC',
});

const totalUsers = new client.Gauge({
  name: 'total_users',
  help: 'Total registered users',
});

const platformStatus = new client.Gauge({
  name: 'platform_status',
  help: 'Platform status (1=healthy, 0=unhealthy)',
  labelNames: ['component'],
});

/**
 * Error metrics
 */
const errorCount = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
});

const errorRate = new client.Gauge({
  name: 'error_rate',
  help: 'Error rate (errors per minute)',
  labelNames: ['type'],
});

/**
 * Express middleware for HTTP metrics
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestCount
      .labels(req.method, route, res.statusCode)
      .inc();
    
    if (req.headers['content-length']) {
      httpRequestSize
        .labels(req.method, route)
        .observe(parseInt(req.headers['content-length']));
    }
    
    if (res.get('content-length')) {
      httpResponseSize
        .labels(req.method, route, res.statusCode)
        .observe(parseInt(res.get('content-length')));
    }
  });

  next();
}

/**
 * Track database query
 */
export function trackQuery(queryType, table, duration, status = 'success') {
  dbQueryDuration
    .labels(queryType, table)
    .observe(duration / 1000);
  
  dbQueryCount
    .labels(queryType, table, status)
    .inc();
}

/**
 * Track authentication
 */
export function trackAuth(method, status) {
  authAttempts
    .labels(method, status)
    .inc();
}

/**
 * Track authentication duration
 */
export function trackAuthDuration(method, duration) {
  authDuration
    .labels(method)
    .observe(duration / 1000);
}

/**
 * Track payment
 */
export function trackPayment(amount, status, method = 'nwc') {
  paymentCount
    .labels(status, method)
    .inc();
  
  paymentAmount
    .labels(status)
    .observe(amount);
}

/**
 * Track payment processing duration
 */
export function trackPaymentDuration(method, duration) {
  paymentProcessingDuration
    .labels(method)
    .observe(duration / 1000);
}

/**
 * Track rental
 */
export function trackRental(status, durationHours, minerModel) {
  rentalCount
    .labels(status)
    .inc();
  
  rentalDuration
    .labels(minerModel)
    .observe(durationHours);
}

/**
 * Update miner metrics
 */
export function updateMinerMetrics(minerId, minerModel, metrics) {
  if (metrics.status !== undefined) {
    minerStatus
      .labels(minerId, minerModel)
      .set(metrics.status ? 1 : 0);
  }
  
  if (metrics.hashRate !== undefined) {
    minerHashRate
      .labels(minerId, minerModel)
      .set(metrics.hashRate);
  }
  
  if (metrics.uptime !== undefined) {
    minerUptime
      .labels(minerId)
      .set(metrics.uptime);
  }
  
  if (metrics.powerConsumption !== undefined) {
    minerPowerConsumption
      .labels(minerId)
      .set(metrics.powerConsumption);
  }
  
  if (metrics.temperature !== undefined) {
    minerTemperature
      .labels(minerId, 'chip')
      .set(metrics.temperature);
  }
}

/**
 * Update gauge metrics
 */
export function updateGauges(updates) {
  if (updates.activeUsers !== undefined) {
    activeUsers.set(updates.activeUsers);
  }
  
  if (updates.activeRentals !== undefined) {
    activeRentals.set(updates.activeRentals);
  }
  
  if (updates.rentalRevenue !== undefined) {
    rentalRevenue.set(updates.rentalRevenue);
  }
  
  if (updates.minerCount !== undefined) {
    minerCount.set(updates.minerCount);
  }
  
  if (updates.totalRevenue !== undefined) {
    totalRevenue.set(updates.totalRevenue);
  }
  
  if (updates.totalUsers !== undefined) {
    totalUsers.set(updates.totalUsers);
  }
}

/**
 * Track errors
 */
export function trackError(type, severity = 'error') {
  errorCount
    .labels(type, severity)
    .inc();
}

/**
 * Collect all metrics
 */
export function collectMetrics() {
  return client.register.metrics();
}

/**
 * Get metrics as JSON
 */
export function getMetricsJSON() {
  return client.register.getMetricsAsJSON();
}

export default {
  httpDuration,
  httpRequestCount,
  dbQueryDuration,
  dbQueryCount,
  authAttempts,
  paymentCount,
  rentalCount,
  minerCount,
  metricsMiddleware,
  trackQuery,
  trackAuth,
  trackAuthDuration,
  trackPayment,
  trackPaymentDuration,
  trackRental,
  updateMinerMetrics,
  updateGauges,
  trackError,
  collectMetrics,
  getMetricsJSON,
};
