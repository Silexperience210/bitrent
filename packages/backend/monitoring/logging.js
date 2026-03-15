/**
 * Winston Logging Configuration
 * BitRent Phase 4: Centralized Logging
 */

import winston from 'winston';
import config from '../config/env.js';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

/**
 * Custom logging format
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(stack && { stack }),
      ...meta,
    });
  })
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: config.log.level || 'info',
  format: customFormat,
  defaultMeta: { service: 'bitrent-api' },
  
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
    
    // Debug logs (development only)
    ...(config.isDevelopment() ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ] : []),
  ],
});

// Console transport for all environments
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    ),
  })
);

/**
 * Express middleware for logging HTTP requests
 */
export function httpLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level]('Request completed', {
      method: req.method,
      url: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}

/**
 * Log authentication events
 */
export function logAuthEvent(event, userId, details = {}) {
  logger.info(`Auth event: ${event}`, {
    userId,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log payment events
 */
export function logPaymentEvent(event, paymentId, details = {}) {
  logger.info(`Payment event: ${event}`, {
    paymentId,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log rental events
 */
export function logRentalEvent(event, rentalId, details = {}) {
  logger.info(`Rental event: ${event}`, {
    rentalId,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log database events
 */
export function logDatabaseEvent(event, query, duration, details = {}) {
  const level = duration > 1000 ? 'warn' : 'debug';
  
  logger[level](`Database event: ${event}`, {
    event,
    query: query.substring(0, 100), // Truncate long queries
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log error with full context
 */
export function logError(error, context = {}) {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

/**
 * Log security events
 */
export function logSecurityEvent(event, severity = 'warning', details = {}) {
  logger.warn(`Security event: ${event}`, {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log performance metrics
 */
export function logPerformanceMetric(name, value, unit = 'ms', details = {}) {
  const level = value > 1000 ? 'warn' : 'debug';
  
  logger[level](`Performance metric: ${name}`, {
    metric: name,
    value,
    unit,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Log audit trail
 */
export function logAuditTrail(action, actor, target, result, details = {}) {
  logger.info('Audit trail', {
    action,
    actor,
    target,
    result,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Create a child logger with context
 */
export function createContextLogger(context) {
  return {
    info: (message, meta = {}) =>
      logger.info(message, { ...context, ...meta }),
    warn: (message, meta = {}) =>
      logger.warn(message, { ...context, ...meta }),
    error: (message, meta = {}) =>
      logger.error(message, { ...context, ...meta }),
    debug: (message, meta = {}) =>
      logger.debug(message, { ...context, ...meta }),
  };
}

/**
 * Get logs for a specific date range
 */
export async function getLogs(startDate, endDate, level = 'info') {
  return new Promise((resolve, reject) => {
    const options = {
      from: startDate,
      until: endDate,
      limit: 100,
      start: 0,
      order: 'desc',
      fields: ['timestamp', 'level', 'message'],
    };

    logger.query(options, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

/**
 * Export logs to file
 */
export function exportLogs(filename, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filename);
    
    getLogs(startDate, endDate)
      .then(logs => {
        logs.forEach(log => {
          ws.write(JSON.stringify(log) + '\n');
        });
        ws.end();
        resolve();
      })
      .catch(reject);
  });
}

export default {
  logger,
  httpLogger,
  logAuthEvent,
  logPaymentEvent,
  logRentalEvent,
  logDatabaseEvent,
  logError,
  logSecurityEvent,
  logPerformanceMetric,
  logAuditTrail,
  createContextLogger,
  getLogs,
  exportLogs,
};
