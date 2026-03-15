/**
 * Sentry Configuration
 * BitRent Phase 4: Error Tracking & Monitoring
 */

import * as Sentry from '@sentry/node';
import config from '../config/env.js';

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
  if (!config.sentry.dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    tracesSampleRate: config.isProduction() ? 0.1 : 1.0,
    
    // Performance monitoring
    profilesSampleRate: 0.1,
    
    // Error handling
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
    
    // Integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out specific error types
      if (event.exception) {
        const error = hint.originalException;
        
        // Ignore expected errors
        if (error?.message?.includes('ECONNREFUSED')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Attach stack trace
    attachStacktrace: true,
  });
}

/**
 * Express middleware for Sentry error handling
 */
export function sentryErrorHandler(err, req, res, next) {
  Sentry.captureException(err, {
    contexts: {
      express: {
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
      },
    },
  });

  next(err);
}

/**
 * Capture exceptions with additional context
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture messages
 */
export function captureMessage(message, level = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUserContext(userId, email = null) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking
 */
export function addBreadcrumb(message, data = {}, category = 'custom', level = 'info') {
  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name, op = 'http.server') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Create a span for performance tracking
 */
export function createSpan(transaction, name, op = 'http.request') {
  return transaction?.startChild({
    op,
    description: name,
  });
}

/**
 * Monitor async function performance
 */
export async function monitorAsyncFunction(name, asyncFn) {
  const transaction = startTransaction(name);
  const span = createSpan(transaction, name, 'async');

  try {
    const result = await asyncFn();
    span?.finish();
    transaction?.finish();
    return result;
  } catch (error) {
    captureException(error, { context: name });
    span?.finish();
    transaction?.finish();
    throw error;
  }
}

/**
 * Monitor route handler
 */
export function monitorRoute(handler) {
  return async (req, res, next) => {
    const transaction = startTransaction(`${req.method} ${req.path}`);

    try {
      await handler(req, res, next);
    } catch (error) {
      captureException(error, {
        method: req.method,
        url: req.url,
      });
      next(error);
    } finally {
      transaction?.finish();
    }
  };
}

/**
 * Monitor database query
 */
export function monitorQuery(name, queryFn) {
  const span = Sentry.getActiveTransaction()?.startChild({
    op: 'db.query',
    description: name,
  });

  try {
    const result = queryFn();
    return result;
  } finally {
    span?.finish();
  }
}

/**
 * Create issue on critical errors
 */
export function reportCriticalError(error, priority = 'high') {
  Sentry.captureException(error, {
    level: 'fatal',
    contexts: {
      severity: {
        priority,
      },
    },
  });
}

export default {
  initSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
  createSpan,
  monitorAsyncFunction,
  monitorRoute,
  monitorQuery,
  reportCriticalError,
};
